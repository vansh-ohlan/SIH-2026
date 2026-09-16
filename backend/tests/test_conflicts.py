"""Tests for the Conflict & Reconciliation Engine.

These cover each deterministic rule, the deliberate non-rules (a repeated
owner name, unitless areas, and low AI confidence must *not* raise conflicts),
evidence/provenance preservation, and the engine's ordering guarantees.
"""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Any, Optional

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from backend.app.services.conflict import (
    ConflictEngine,
    IssueType,
    Severity,
    build_conflict_report,
    deduplicate_issues,
    run_rule,
    severity_counts,
    sort_issues,
)
from backend.app.services.conflict.issue_types import ConflictIssue
from backend.app.services.conflict.rules import (
    detect_area_conflicts,
    detect_duplicate_khasra,
    detect_missing_mandatory_fields,
    detect_mutation_conflicts,
    detect_owner_conflicts,
    preserve_ai_extraction_conflicts,
)


def field(value: Any, **provenance: Any) -> dict[str, Any]:
    """Build an extracted-field wrapper, optionally carrying provenance."""
    wrapper: dict[str, Any] = {"value": value}
    if provenance:
        wrapper["provenance"] = provenance
    return wrapper


def analysis(
    metadata: Optional[dict[str, Any]] = None,
    landholders: Optional[list[dict[str, Any]]] = None,
    parcels: Optional[list[dict[str, Any]]] = None,
    conflicts: Optional[list[dict[str, Any]]] = None,
    **top_level: Any,
) -> dict[str, Any]:
    """Build an AnalysisResponse-shaped payload."""
    payload: dict[str, Any] = {
        "extraction_result": {
            "status": "success",
            "metadata": metadata or {},
            "landholders": landholders or [],
            "parcels": parcels or [],
            "conflicts": conflicts or [],
        }
    }
    payload.update(top_level)
    return payload


def complete(
    metadata: Optional[dict[str, Any]] = None,
    landholders: Optional[list[dict[str, Any]]] = None,
    parcels: Optional[list[dict[str, Any]]] = None,
    conflicts: Optional[list[dict[str, Any]]] = None,
    **top_level: Any,
) -> dict[str, Any]:
    """Build a payload that already satisfies every mandatory-field check.

    Lets a rule test vary one thing at a time without also tripping the
    mandatory-field rule.
    """
    return analysis(
        metadata={"khata_number": field("12"), **(metadata or {})},
        landholders=[{"name": field("Ramesh Kumar")}] if landholders is None else landholders,
        parcels=(
            [{"khasra_number": field("142/1"), "area_raw": field("5")}]
            if parcels is None
            else parcels
        ),
        conflicts=conflicts,
        **top_level,
    )


def types(issues: list[ConflictIssue]) -> list[str]:
    return [issue.issue_type for issue in issues]


class TestOwnerContradiction:
    def test_duplicate_owner_name_alone_is_not_a_conflict(self):
        """Two identical owner entries are co-owners, not a contradiction."""
        result = analysis(
            landholders=[
                {"name": field("Ramesh Kumar"), "share": field("0.5")},
                {"name": field("Ramesh Kumar"), "share": field("0.5")},
            ]
        )
        assert detect_owner_conflicts(result) == []

    def test_same_name_different_father_is_a_conflict(self):
        result = analysis(
            landholders=[
                {"name": field("Ramesh Kumar"), "father_or_husband_name": field("Suresh")},
                {"name": field("Ramesh Kumar"), "father_or_husband_name": field("Mahesh")},
            ]
        )
        issues = detect_owner_conflicts(result)
        assert len(issues) == 1
        assert issues[0].issue_type == IssueType.OWNER_MISMATCH.value
        assert issues[0].severity == Severity.HIGH.value
        assert issues[0].rule == "owner_contradiction"
        assert issues[0].evidence["contradictory_attributes"] == ["father_or_husband_name"]

    def test_same_name_different_share_is_a_conflict(self):
        result = analysis(
            landholders=[
                {"name": field("Ramesh Kumar"), "share": field("0.5")},
                {"name": field("Ramesh Kumar"), "share": field("0.25")},
            ]
        )
        issues = detect_owner_conflicts(result)
        assert len(issues) == 1
        assert issues[0].evidence["contradictory_attributes"] == ["share"]

    def test_owner_name_comparison_is_case_and_whitespace_insensitive(self):
        result = analysis(
            landholders=[
                {"name": field("  RAMESH   Kumar "), "share": field("0.5")},
                {"name": field("ramesh kumar"), "share": field("0.25")},
            ]
        )
        assert len(detect_owner_conflicts(result)) == 1

    def test_distinct_owners_are_not_a_conflict(self):
        result = analysis(
            landholders=[
                {"name": field("Ramesh Kumar"), "share": field("0.5")},
                {"name": field("Suresh Kumar"), "share": field("0.5")},
            ]
        )
        assert detect_owner_conflicts(result) == []

    def test_independent_extractors_disagreeing_on_owner(self):
        result = analysis(
            landholders=[
                {
                    "name": field(
                        "Ramesh Kumar",
                        source_field="owner_row_1",
                        extraction_method="pattern",
                    )
                },
                {
                    "name": field(
                        "Ramesh Kumari",
                        source_field="owner_row_1",
                        extraction_method="llm",
                    )
                },
            ]
        )
        issues = detect_owner_conflicts(result)
        assert len(issues) == 1
        assert issues[0].severity == Severity.MEDIUM.value
        assert issues[0].evidence["reason"] == (
            "different_owner_values_from_independent_extractors"
        )
        assert issues[0].evidence["extraction_methods"] == ["llm", "pattern"]

    def test_same_extractor_repeating_a_value_is_not_a_conflict(self):
        """One method disagreeing with itself is duplication, not contradiction."""
        result = analysis(
            landholders=[
                {
                    "name": field("Ramesh", source_field="owner_row_1", extraction_method="pattern")
                },
                {
                    "name": field("Ramesh Kumar", source_field="owner_row_1", extraction_method="pattern")
                },
            ]
        )
        assert detect_owner_conflicts(result) == []

    def test_owner_evidence_preserves_provenance(self):
        provenance = {"page": 2, "bbox": [10, 20, 30, 40], "confidence": 0.91}
        result = analysis(
            landholders=[
                {"name": field("Ramesh", **provenance), "share": field("0.5")},
                {"name": field("Ramesh"), "share": field("0.25")},
            ]
        )
        issues = detect_owner_conflicts(result)
        owners = issues[0].evidence["owners"]
        assert owners[0]["provenance"] == provenance
        assert owners[1]["provenance"] == {}


class TestAreaContradiction:
    def test_unitless_area_values_are_never_compared(self):
        """A bare number has no unit, so no assumption may be made about it."""
        result = analysis(
            parcels=[
                {"khasra_number": field("1"), "area_raw": field("100"), "area_normalized": field(100)},
                {"khasra_number": field("2"), "area_raw": field("900"), "area_normalized": field(900)},
            ]
        )
        assert detect_area_conflicts(result) == []

    def test_unknown_area_unit_is_never_compared(self):
        result = analysis(
            parcels=[
                {"khasra_number": field("1"), "area_unit": field("biswa"), "area_normalized": field(4)},
                {"khasra_number": field("2"), "area_unit": field("biswa"), "area_normalized": field(9)},
            ]
        )
        assert detect_area_conflicts(result) == []

    def test_comparable_units_with_differing_values_conflict(self):
        result = analysis(
            parcels=[
                {"khasra_number": field("1"), "area_unit": field("sqm"), "area_normalized": field(100)},
                {"khasra_number": field("2"), "area_unit": field("sqm"), "area_normalized": field(900)},
            ]
        )
        issues = detect_area_conflicts(result)
        assert len(issues) == 1
        assert issues[0].issue_type == IssueType.AREA_MISMATCH.value
        assert issues[0].severity == Severity.HIGH.value
        assert issues[0].rule == "area_contradiction"
        assert issues[0].evidence["unit"] == "sqm"
        assert issues[0].evidence["values"] == [100.0, 900.0]
        assert issues[0].evidence["comparable"] is True
        assert issues[0].evidence["conversion_applied"] is False

    def test_unit_aliases_are_canonicalized(self):
        result = analysis(
            parcels=[
                {"khasra_number": field("1"), "area_unit": field("sqm"), "area_normalized": field(100)},
                {"khasra_number": field("2"), "area_unit": field("SQ M"), "area_normalized": field(900)},
            ]
        )
        assert len(detect_area_conflicts(result)) == 1

    def test_different_units_are_not_converted_or_compared(self):
        """1 hectare and 900 sqm must not be compared by assuming a factor."""
        result = analysis(
            parcels=[
                {"khasra_number": field("1"), "area_unit": field("hectare"), "area_normalized": field(1)},
                {"khasra_number": field("2"), "area_unit": field("sqm"), "area_normalized": field(900)},
            ]
        )
        assert detect_area_conflicts(result) == []

    def test_matching_areas_do_not_conflict(self):
        result = analysis(
            parcels=[
                {"khasra_number": field("1"), "area_unit": field("acre"), "area_normalized": field(2.5)},
                {"khasra_number": field("2"), "area_unit": field("acre"), "area_normalized": field(2.5)},
            ]
        )
        assert detect_area_conflicts(result) == []

    def test_falls_back_to_raw_area_when_normalized_absent(self):
        result = analysis(
            parcels=[
                {"khasra_number": field("1"), "area_unit": field("sqm"), "area_raw": field("100")},
                {"khasra_number": field("2"), "area_unit": field("sqm"), "area_raw": field("900")},
            ]
        )
        assert len(detect_area_conflicts(result)) == 1

    def test_area_evidence_preserves_provenance(self):
        result = analysis(
            parcels=[
                {
                    "khasra_number": field("1"),
                    "area_unit": field("sqm"),
                    "area_raw": field("100", page=1, bbox=[1, 2, 3, 4]),
                },
                {"khasra_number": field("2"), "area_unit": field("sqm"), "area_raw": field("900")},
            ]
        )
        issues = detect_area_conflicts(result)
        assert issues[0].evidence["parcels"][0]["provenance"] == {
            "page": 1,
            "bbox": [1, 2, 3, 4],
        }


class TestDuplicateKhasra:
    def test_duplicate_khasra_detected(self):
        result = analysis(
            parcels=[
                {"khasra_number": field("142/1"), "area_raw": field("5")},
                {"khasra_number": field("142/1"), "area_raw": field("5")},
            ]
        )
        issues = detect_duplicate_khasra(result)
        assert len(issues) == 1
        assert issues[0].issue_type == IssueType.DUPLICATE_KHASRA.value
        assert issues[0].severity == Severity.HIGH.value
        assert issues[0].rule == "duplicate_khasra"
        assert issues[0].evidence["khasra"] == "142/1"
        assert len(issues[0].evidence["occurrences"]) == 2

    def test_separator_variants_are_the_same_khasra(self):
        result = analysis(
            parcels=[
                {"khasra_number": field("142-1")},
                {"khasra_number": field("142.1")},
                {"khasra_number": field("142/1")},
            ]
        )
        issues = detect_duplicate_khasra(result)
        assert len(issues) == 1
        assert len(issues[0].evidence["occurrences"]) == 3

    def test_distinct_khasra_numbers_do_not_conflict(self):
        result = analysis(
            parcels=[{"khasra_number": field("142/1")}, {"khasra_number": field("142/2")}]
        )
        assert detect_duplicate_khasra(result) == []

    def test_missing_khasra_is_not_treated_as_a_duplicate(self):
        result = analysis(parcels=[{"area_raw": field("5")}, {"area_raw": field("6")}])
        assert detect_duplicate_khasra(result) == []


class TestMutationInconsistency:
    def test_missing_mutation_details_is_a_warning(self):
        """A reference without details is incomplete, not contradictory."""
        result = analysis(metadata={"mutation_number": field("M-9")})
        issues = detect_mutation_conflicts(result)
        assert len(issues) == 1
        assert issues[0].severity == Severity.LOW.value
        assert issues[0].field == "mutation_details"
        assert issues[0].rule == "mutation_inconsistency"

    def test_missing_mutation_date_details_is_a_warning(self):
        result = analysis(metadata={"mutation_date": field("2020-01-01")})
        issues = detect_mutation_conflicts(result)
        assert len(issues) == 1
        assert issues[0].severity == Severity.LOW.value

    def test_contradictory_mutation_numbers(self):
        result = analysis(
            metadata={"mutation_number": {"values": ["M-9", "M-10"]}}
        )
        issues = detect_mutation_conflicts(result)
        assert len(issues) == 1
        assert issues[0].severity == Severity.HIGH.value
        assert issues[0].field == "mutation"
        assert "mutation_number" in issues[0].evidence["contradictory_fields"]

    def test_details_contradicting_mutation_number(self):
        result = analysis(
            metadata={
                "mutation_number": field("M-9"),
                "mutation_details": field("Mutation No: M-10 dated 2020-01-01"),
            }
        )
        issues = detect_mutation_conflicts(result)
        assert len(issues) == 1
        assert issues[0].severity == Severity.HIGH.value
        assert "mutation_details.mutation_number" in issues[0].evidence["contradictory_fields"]

    def test_details_contradicting_mutation_date(self):
        result = analysis(
            metadata={
                "mutation_date": field("2020-01-01"),
                "mutation_details": field("Mutation No: M-9 dated 2021-05-05"),
            }
        )
        issues = detect_mutation_conflicts(result)
        assert len(issues) == 1
        assert "mutation_details.mutation_date" in issues[0].evidence["contradictory_fields"]

    def test_consistent_mutation_is_not_a_conflict(self):
        result = analysis(
            metadata={
                "mutation_number": field("M-9"),
                "mutation_date": field("2020-01-01"),
                "mutation_details": field("Mutation No: M-9 dated 2020-01-01"),
            }
        )
        assert detect_mutation_conflicts(result) == []

    def test_no_mutation_data_is_not_a_conflict(self):
        assert detect_mutation_conflicts(analysis()) == []

    def test_mutation_evidence_preserves_provenance(self):
        result = analysis(
            metadata={"mutation_number": field("M-9", page=3, line=12)}
        )
        issues = detect_mutation_conflicts(result)
        assert issues[0].evidence["mutation_number"]["provenance"] == {"page": 3, "line": 12}


class TestMandatoryFields:
    def test_missing_khata_number_by_default(self):
        payload = complete()
        del payload["extraction_result"]["metadata"]["khata_number"]
        issues = detect_missing_mandatory_fields(payload)
        assert [issue.field for issue in issues] == ["khata_number"]
        assert issues[0].issue_type == IssueType.MISSING_MANDATORY.value
        assert issues[0].severity == Severity.HIGH.value
        assert issues[0].rule == "mandatory_field_check"
        assert issues[0].evidence["expected"] == "non-empty value"

    def test_complete_record_has_no_mandatory_findings(self):
        assert detect_missing_mandatory_fields(complete()) == []

    def test_blank_value_counts_as_missing(self):
        issues = detect_missing_mandatory_fields(
            complete(metadata={"khata_number": field("   ")})
        )
        assert [issue.field for issue in issues] == ["khata_number"]

    def test_custom_mandatory_fields(self):
        issues = detect_missing_mandatory_fields(
            complete(), mandatory_fields=("khata_number", "khewat_number", "village")
        )
        assert [issue.field for issue in issues] == ["khewat_number", "village"]

    def test_missing_owners_flagged(self):
        issues = detect_missing_mandatory_fields(complete(landholders=[]))
        assert [issue.field for issue in issues] == ["landholders.name"]
        assert issues[0].evidence["expected"] == "at least one owner"

    def test_missing_owner_name_flagged_with_index(self):
        issues = detect_missing_mandatory_fields(
            complete(landholders=[{"name": field("Ramesh")}, {"name": field(None)}])
        )
        assert [issue.field for issue in issues] == ["landholders[1].name"]

    def test_missing_parcel_khasra_and_area_flagged(self):
        issues = detect_missing_mandatory_fields(complete(parcels=[{}]))
        assert [issue.field for issue in issues] == [
            "parcels[0].khasra_number",
            "parcels[0].area",
        ]

    def test_area_present_via_normalized_only_is_sufficient(self):
        issues = detect_missing_mandatory_fields(
            complete(
                parcels=[{"khasra_number": field("1"), "area_normalized": field(100)}]
            )
        )
        assert issues == []


class TestAiExtractionConflicts:
    def test_ai_conflicts_are_preserved(self):
        reported = {
            "field": "area",
            "type": "area_mismatch",
            "severity": "critical",
            "message": "Area mismatch between RoR and map",
            "provenance": {"page": 2, "bbox": [1, 2, 3, 4]},
        }
        issues = preserve_ai_extraction_conflicts(analysis(conflicts=[reported]))
        assert len(issues) == 1
        assert issues[0].field == "area"
        assert issues[0].issue_type == "area_mismatch"
        assert issues[0].severity == Severity.CRITICAL.value
        assert issues[0].rule == "ai_extraction_conflict"
        assert issues[0].evidence["source"] == "ai"
        assert issues[0].evidence["ai_conflict_index"] == 0
        assert issues[0].evidence["provenance"] == {"page": 2, "bbox": [1, 2, 3, 4]}

    def test_unknown_severity_falls_back_to_medium(self):
        issues = preserve_ai_extraction_conflicts(
            analysis(conflicts=[{"field": "x", "severity": "catastrophic"}])
        )
        assert issues[0].severity == Severity.MEDIUM.value

    def test_conflict_without_message_is_serialized(self):
        issues = preserve_ai_extraction_conflicts(analysis(conflicts=[{"field": "x"}]))
        assert issues[0].message
        assert issues[0].issue_type == IssueType.AI_EXTRACTION_CONFLICT.value

    def test_low_ai_confidence_alone_is_not_a_conflict(self):
        """A poor confidence score is a signal, never a conflict finding."""
        result = analysis(
            metadata={"khata_number": field("12")},
            landholders=[{"name": field("Ramesh")}],
            parcels=[{"khasra_number": field("1"), "area_raw": field("5")}],
            confidence_score=0.01,
            extraction_risk="high",
            anomaly_score=0.99,
            anomaly_risk="critical",
        )
        assert ConflictEngine().run(result) == []

    def test_non_dict_conflict_entries_are_skipped(self):
        assert preserve_ai_extraction_conflicts(analysis(conflicts=["nope", None])) == []


class TestEngineOrdering:
    def _mixed(self) -> dict[str, Any]:
        return complete(
            metadata={"mutation_number": field("M-9")},
            landholders=[
                {"name": field("Ramesh"), "share": field("0.5")},
                {"name": field("Ramesh"), "share": field("0.25")},
            ],
            parcels=[
                {"khasra_number": field("142/1"), "area_unit": field("sqm"), "area_normalized": field(100)},
                {"khasra_number": field("142/1"), "area_unit": field("sqm"), "area_normalized": field(900)},
            ],
            conflicts=[{"field": "area", "type": "area_mismatch", "severity": "critical"}],
        )

    def test_sorted_by_severity_descending_then_rule_order(self):
        issues = ConflictEngine().run(self._mixed())
        ranks = [Severity(issue.severity) for issue in issues]
        order = [Severity.CRITICAL, Severity.HIGH, Severity.HIGH, Severity.HIGH, Severity.LOW]
        assert ranks == order

        high_rules = [issue.rule for issue in issues if issue.severity == Severity.HIGH.value]
        assert high_rules == ["owner_contradiction", "area_contradiction", "duplicate_khasra"]

    def test_output_is_deterministic_across_runs(self):
        engine = ConflictEngine()
        first = [issue.to_dict() for issue in engine.run(self._mixed())]
        second = [issue.to_dict() for issue in engine.run(self._mixed())]
        assert first == second

    def test_rule_order_is_stable_regardless_of_input_ordering(self):
        payload = self._mixed()
        shuffled = analysis(
            metadata=payload["extraction_result"]["metadata"],
            landholders=list(reversed(payload["extraction_result"]["landholders"])),
            parcels=list(reversed(payload["extraction_result"]["parcels"])),
            conflicts=payload["extraction_result"]["conflicts"],
        )
        engine = ConflictEngine()
        assert [(i.rule, i.field) for i in engine.run(payload)] == [
            (i.rule, i.field) for i in engine.run(shuffled)
        ]

    def test_identical_findings_are_deduplicated(self):
        issue = ConflictIssue(
            field="parcels.area",
            issue_type=IssueType.AREA_MISMATCH,
            severity=Severity.HIGH,
            message="same",
            evidence={"unit": "sqm"},
            rule="area_contradiction",
        )
        duplicate = ConflictIssue(**{**issue.__dict__})
        assert len(deduplicate_issues([issue, duplicate])) == 1

    def test_same_field_different_evidence_is_not_deduplicated(self):
        base = dict(
            field="parcels.area",
            issue_type=IssueType.AREA_MISMATCH.value,
            severity=Severity.HIGH.value,
            message="same",
            rule="area_contradiction",
        )
        issues = [
            ConflictIssue(evidence={"unit": "sqm"}, **base),
            ConflictIssue(evidence={"unit": "acre"}, **base),
        ]
        assert len(deduplicate_issues(issues)) == 2

    def test_repeated_rule_names_do_not_duplicate_findings(self):
        engine = ConflictEngine(rules=["all", "all"])
        payload = self._mixed()
        assert len(engine.run(payload)) == len(ConflictEngine().run(payload))

    def test_severity_counts_always_includes_every_severity(self):
        counts = severity_counts(ConflictEngine().run(self._mixed()))
        assert counts == {"low": 1, "medium": 0, "high": 3, "critical": 1}

    def test_sort_issues_is_pure(self):
        issues = ConflictEngine().run(self._mixed())
        assert len(sort_issues(issues)) == len(issues)

    def test_engine_accepts_named_rules(self):
        engine = ConflictEngine(rules=["owner_contradiction"])
        issues = engine.run(self._mixed())
        assert {issue.rule for issue in issues} == {"owner_contradiction"}

    def test_engine_rejects_unknown_rule_type(self):
        with pytest.raises(TypeError):
            ConflictEngine(rules=[42]).run(self._mixed())

    def test_report_payload_shape(self):
        issues = ConflictEngine().run(self._mixed())
        report = build_conflict_report(7, issues)
        assert report["record_id"] == 7
        assert report["total"] == len(issues)
        assert report["severity_counts"] == severity_counts(issues)
        assert report["conflicts"][0].keys() == {
            "field",
            "issue_type",
            "severity",
            "message",
            "evidence",
            "rule",
        }


class TestRunRuleDispatch:
    def test_aliases_resolve_to_the_same_rule(self):
        payload = analysis(
            landholders=[
                {"name": field("Ramesh"), "share": field("0.5")},
                {"name": field("Ramesh"), "share": field("0.25")},
            ]
        )
        for name in ("owner_contradiction", "owner_conflict", "owner_mismatch", "OWNER-CONTRADICTION"):
            assert len(run_rule(name, payload)) == 1

    def test_missing_mandatory_accepts_custom_fields(self):
        issues = run_rule("missing_mandatory", complete(), ("village",))
        assert [issue.field for issue in issues] == ["village"]

    def test_unknown_rule_raises(self):
        with pytest.raises(ValueError, match="Unknown conflict rule"):
            run_rule("not_a_rule", analysis())
