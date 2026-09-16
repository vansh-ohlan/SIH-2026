"""Deterministic conflict-detection rules.

Each rule is a small, pure function that inspects a normalized extraction
and yields :class:`ConflictIssue` objects. Rules are deterministic: no
randomness, no LLM, and no fuzzy matching beyond the explicit normalization
helpers defined here.

Deliberate non-rules, because each would produce false positives:

* A repeated owner name is **not** by itself a conflict. Two entries only
  conflict when their identity or share attributes contradict.
* Area values are only compared when the unit is explicitly present *and*
  recognized. Unknown or absent units are skipped rather than assumed, and no
  cross-unit conversion is ever applied.
* Low AI confidence is **not** a conflict. Confidence is reported elsewhere;
  this module never turns a score into an issue.
* Missing mutation details while a mutation reference exists is a *warning*
  (``Severity.LOW``), not a contradiction.

The accepted input is the shape produced by
``backend.app.repositories.analysis_to_land_record``: an ``AnalysisResponse``
dict/model, or the inner ``extraction_result`` mapping directly.
"""

from __future__ import annotations

import json
import math
import re
import unicodedata
from enum import Enum
from typing import Any, Iterable, Optional, Sequence

from backend.app.services.conflict.issue_types import (
    ConflictIssue,
    IssueType,
    Severity,
    coerce_severity,
)

#: Metadata fields that must be present for a record to be considered complete.
DEFAULT_MANDATORY_FIELDS: tuple[str, ...] = ("khata_number",)

#: Area units we are willing to treat as comparable, mapped to a canonical key.
#: Anything not listed here is refused rather than guessed.
AREA_UNIT_ALIASES: dict[str, str] = {
    "sqm": "sqm",
    "sq m": "sqm",
    "sqmeter": "sqm",
    "sqmeters": "sqm",
    "squaremeter": "sqm",
    "squaremeters": "sqm",
    "m2": "sqm",
    "hectare": "hectare",
    "hectares": "hectare",
    "ha": "hectare",
    "acre": "acre",
    "acres": "acre",
    "bigha": "bigha",
    "bighas": "bigha",
    "marla": "marla",
    "marlas": "marla",
    "kanal": "kanal",
    "kanals": "kanal",
    "sarsai": "sarsai",
    "sarsais": "sarsai",
}


# --------------------------------------------------------------------------- #
# Normalization helpers
# --------------------------------------------------------------------------- #


def _mapping(value: Any) -> dict[str, Any]:
    """Coerce ``value`` to a plain dict, returning ``{}`` when impossible."""
    if isinstance(value, dict):
        return value
    if hasattr(value, "model_dump"):
        try:
            data = value.model_dump(mode="json")
        except TypeError:
            data = value.model_dump()
        return data if isinstance(data, dict) else {}
    return {}


def _safe(value: Any) -> Any:
    """Recursively convert ``value`` into something JSON-serializable."""
    if isinstance(value, Enum):
        return _safe(value.value)
    if hasattr(value, "model_dump"):
        try:
            return _safe(value.model_dump(mode="json"))
        except TypeError:
            return _safe(value.model_dump())
    if isinstance(value, dict):
        return {str(key): _safe(item) for key, item in value.items()}
    if isinstance(value, (list, tuple, set)):
        return [_safe(item) for item in value]
    if isinstance(value, float) and not math.isfinite(value):
        return None
    if isinstance(value, (str, int, float, bool)) or value is None:
        return value
    return str(value)


def _get_field(container: Any, key: str) -> Any:
    """Return ``container[key]`` when the container is a mapping."""
    if not isinstance(container, dict):
        return None
    return container.get(key)


def _value(field: Any) -> Optional[str]:
    """Extract the trimmed string value of an extracted-field wrapper."""
    if field is None:
        return None
    if isinstance(field, dict):
        value = field.get("value")
    elif hasattr(field, "value"):
        value = field.value
    else:
        value = field
    if value is None:
        return None
    if isinstance(value, (dict, list, tuple)):
        return None
    text = str(value).strip()
    return text or None


def _provenance(field: Any) -> dict[str, Any]:
    """Extract the provenance mapping attached to a field, if any."""
    if field is None:
        return {}
    if isinstance(field, dict):
        prov = field.get("provenance")
    elif hasattr(field, "provenance"):
        prov = field.provenance
        if hasattr(prov, "model_dump"):
            prov = prov.model_dump()
    else:
        prov = None
    return prov if isinstance(prov, dict) else {}


def _norm_text(value: Any) -> str:
    """Normalize text for comparison: NFKC, casefold, collapsed whitespace."""
    text = _value(value) or ""
    text = unicodedata.normalize("NFKC", text).casefold()
    return re.sub(r"\s+", " ", text).strip()


def _to_float(value: Any) -> Optional[float]:
    """Parse a finite float, refusing anything that is not plainly numeric."""
    if value is None or isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        result = float(value)
        return result if math.isfinite(result) else None
    text = str(value).strip().replace(",", "")
    if not re.fullmatch(r"[+-]?(?:\d+(?:\.\d*)?|\.\d+)", text):
        return None
    try:
        result = float(text)
    except ValueError:
        return None
    return result if math.isfinite(result) else None


def _canonical_area_unit(value: Any) -> Optional[str]:
    """Map an area unit to its canonical form, or ``None`` when unrecognized.

    Returning ``None`` is the point: callers must skip the comparison instead
    of inventing a unit.
    """
    text = _norm_text(value)
    if not text:
        return None
    compact = re.sub(r"[^a-z0-9]+", "", text)
    return AREA_UNIT_ALIASES.get(text) or AREA_UNIT_ALIASES.get(compact)


def _norm_khasra(value: Any) -> str:
    """Normalize a Khasra number so ``142-1``, ``142.1`` and ``142/1`` match."""
    text = _value(value)
    if not text:
        return ""
    text = text.replace("-", "/").replace(".", "/")
    return re.sub(r"/+", "/", text).strip().casefold()


def _field_variants(field: Any) -> list[Any]:
    """Return every candidate value carried by a field wrapper."""
    if field is None:
        return []
    if isinstance(field, dict) and isinstance(field.get("values"), list):
        return list(field["values"])
    if _value(field) is None:
        return []
    if isinstance(field, dict) and isinstance(field.get("value"), list):
        return list(field["value"])
    if isinstance(field, list):
        return list(field)
    return [field]


def _distinct(values: Iterable[Any]) -> list[str]:
    """Return distinct normalized texts, in first-seen order."""
    result: list[str] = []
    seen: set[str] = set()
    for value in values:
        text = _norm_text(value)
        if text and text not in seen:
            seen.add(text)
            result.append(text)
    return result


def _source_identity(field: Any) -> Optional[tuple[str, ...]]:
    """Return the provenance coordinates that identify where a field came from."""
    provenance = _provenance(field)
    if not provenance:
        return None
    parts = tuple(
        str(provenance[key])
        for key in ("source_field", "field", "path")
        if provenance.get(key) not in (None, "")
    )
    return parts or None


def _method(field: Any) -> str:
    """Return the extraction method recorded in a field's provenance."""
    provenance = _provenance(field)
    for key in ("extraction_method", "method", "extractor"):
        if provenance.get(key) not in (None, ""):
            return _norm_text(provenance[key])
    return ""


# --------------------------------------------------------------------------- #
# Extraction accessors
# --------------------------------------------------------------------------- #


def _extraction(analysis: Any) -> dict[str, Any]:
    """Locate the extraction mapping inside any supported input shape."""
    if isinstance(analysis, dict):
        extraction = analysis.get("extraction_result")
        if isinstance(extraction, dict):
            return extraction
        if any(
            key in analysis for key in ("metadata", "landholders", "parcels", "conflicts")
        ):
            return analysis
        return _mapping(analysis.get("record"))
    if hasattr(analysis, "model_dump"):
        try:
            data = analysis.model_dump(mode="json")
        except TypeError:
            data = analysis.model_dump()
        return _extraction(data) if isinstance(data, dict) else {}
    if hasattr(analysis, "extraction_result"):
        return _mapping(getattr(analysis, "extraction_result"))
    if hasattr(analysis, "record"):
        return _mapping(getattr(analysis, "record"))
    return {}


def _metadata(analysis: Any) -> dict[str, Any]:
    return _mapping(_get_field(_extraction(analysis), "metadata"))


def _holders(analysis: Any) -> list[dict[str, Any]]:
    holders = _get_field(_extraction(analysis), "landholders")
    if not isinstance(holders, list):
        return []
    return [_mapping(holder) for holder in holders]


def _parcels(analysis: Any) -> list[dict[str, Any]]:
    parcels = _get_field(_extraction(analysis), "parcels")
    if not isinstance(parcels, list):
        return []
    return [_mapping(parcel) for parcel in parcels]


def _field_evidence(label: str, field: Any) -> dict[str, Any]:
    """Build the evidence block for a field, preserving its provenance."""
    return {
        "field": label,
        "value": _safe(_value(field)),
        "provenance": _safe(_provenance(field)),
    }


def _issue(
    field: Optional[str],
    issue_type: Any,
    severity: Any,
    message: str,
    evidence: dict[str, Any],
    rule: str,
) -> ConflictIssue:
    return ConflictIssue(
        field=field,
        issue_type=issue_type,
        severity=severity,
        message=message,
        evidence=evidence,
        rule=rule,
    )


# --------------------------------------------------------------------------- #
# Rule 1 - owner contradiction
# --------------------------------------------------------------------------- #


def _owner_entry(index: int, holder: dict[str, Any]) -> dict[str, Any]:
    name = _get_field(holder, "name")
    father = _get_field(holder, "father_or_husband_name")
    share = _get_field(holder, "share")
    return {
        "index": index,
        "name": _safe(_value(name)),
        "father_or_husband_name": _safe(_value(father)),
        "share": _safe(_value(share)),
        "provenance": _safe(_provenance(name)),
    }


def detect_owner_conflicts(analysis: Any) -> list[ConflictIssue]:
    """Flag contradictory owner identities.

    A repeated name alone is not a conflict: the duplicates must disagree on
    father/husband name or share, or come from independent extractors that
    returned different names for the same source location.
    """
    issues: list[ConflictIssue] = []
    holders = list(enumerate(_holders(analysis)))

    by_name: dict[str, list[tuple[int, dict[str, Any]]]] = {}
    for index, holder in holders:
        key = _norm_text(_get_field(holder, "name"))
        if key:
            by_name.setdefault(key, []).append((index, holder))

    for name, entries in sorted(by_name.items()):
        if len(entries) < 2:
            continue
        fathers = _distinct(
            _get_field(holder, "father_or_husband_name") for _, holder in entries
        )
        shares = _distinct(_get_field(holder, "share") for _, holder in entries)
        if len(fathers) > 1 or len(shares) > 1:
            contradictory = ["father_or_husband_name"] if len(fathers) > 1 else []
            contradictory += ["share"] if len(shares) > 1 else []
            evidence = {
                "owner_name": name,
                "owners": [_owner_entry(index, holder) for index, holder in entries],
                "reason": "same_owner_different_attributes",
                "contradictory_attributes": sorted(contradictory),
            }
            issues.append(
                _issue(
                    "landholders.name",
                    IssueType.OWNER_MISMATCH,
                    Severity.HIGH,
                    "Repeated owner name has contradictory identity or share attributes.",
                    evidence,
                    "owner_contradiction",
                )
            )

    by_source: dict[tuple[str, ...], list[tuple[int, dict[str, Any]]]] = {}
    for index, holder in holders:
        source = _source_identity(_get_field(holder, "name"))
        if source is not None:
            by_source.setdefault(source, []).append((index, holder))

    for source, entries in sorted(by_source.items()):
        names = _distinct(_get_field(holder, "name") for _, holder in entries)
        methods = {_method(_get_field(holder, "name")) for _, holder in entries}
        methods.discard("")
        if len(names) > 1 and len(methods) > 1:
            evidence = {
                "source": list(source),
                "owners": [_owner_entry(index, holder) for index, holder in entries],
                "extraction_methods": sorted(methods),
                "reason": "different_owner_values_from_independent_extractors",
            }
            issues.append(
                _issue(
                    "landholders.name",
                    IssueType.OWNER_MISMATCH,
                    Severity.MEDIUM,
                    "Independent extractors returned different owner names for the same source.",
                    evidence,
                    "owner_contradiction",
                )
            )

    return issues


# --------------------------------------------------------------------------- #
# Rule 2 - comparable area mismatch
# --------------------------------------------------------------------------- #


def _area_entry(index: int, parcel: dict[str, Any]) -> Optional[dict[str, Any]]:
    """Build a comparable area entry, or ``None`` when the unit is not explicit."""
    raw = _get_field(parcel, "area_raw")
    normalized = _get_field(parcel, "area_normalized")
    unit_field = _get_field(parcel, "area_unit")

    unit = _canonical_area_unit(unit_field)
    if unit is None:
        return None

    value = _to_float(_value(normalized))
    if value is None:
        value = _to_float(_value(raw))
    if value is None:
        return None

    return {
        "parcel_index": index,
        "value": value,
        "unit": unit,
        "raw": _safe(_value(raw)),
        "normalized": _safe(_value(normalized)),
        "unit_raw": _safe(_value(unit_field)),
        "provenance": _safe(_provenance(raw) or _provenance(normalized)),
    }


def detect_area_conflicts(analysis: Any) -> list[ConflictIssue]:
    """Flag differing areas among parcels whose units are explicitly comparable.

    Parcels with a missing or unrecognized unit are skipped entirely, and no
    conversion is applied, so a bare number is never assumed to be square
    metres, hectares, or bighas.
    """
    entries = [
        entry
        for entry in (
            _area_entry(index, parcel) for index, parcel in enumerate(_parcels(analysis))
        )
        if entry is not None
    ]

    by_unit: dict[str, list[dict[str, Any]]] = {}
    for entry in entries:
        by_unit.setdefault(entry["unit"], []).append(entry)

    issues: list[ConflictIssue] = []
    for unit in sorted(by_unit):
        group = by_unit[unit]
        values = sorted({entry["value"] for entry in group})
        if len(values) < 2:
            continue
        evidence = {
            "unit": unit,
            "values": values,
            "parcels": group,
            "comparable": True,
            "conversion_applied": False,
        }
        issues.append(
            _issue(
                "parcels.area",
                IssueType.AREA_MISMATCH,
                Severity.HIGH,
                f"Area values differ for parcels with explicitly comparable unit '{unit}'.",
                evidence,
                "area_contradiction",
            )
        )
    return issues


# --------------------------------------------------------------------------- #
# Rule 3 - duplicate Khasra
# --------------------------------------------------------------------------- #


def detect_duplicate_khasra(analysis: Any) -> list[ConflictIssue]:
    """Flag a Khasra number that appears on more than one parcel."""
    by_khasra: dict[str, list[dict[str, Any]]] = {}
    for index, parcel in enumerate(_parcels(analysis)):
        field = _get_field(parcel, "khasra_number")
        key = _norm_khasra(field)
        if not key:
            continue
        by_khasra.setdefault(key, []).append(
            {
                "parcel_index": index,
                "value": _safe(_value(field)),
                "provenance": _safe(_provenance(field)),
            }
        )

    issues: list[ConflictIssue] = []
    for key in sorted(by_khasra):
        entries = by_khasra[key]
        if len(entries) < 2:
            continue
        issues.append(
            _issue(
                "parcels.khasra_number",
                IssueType.DUPLICATE_KHASRA,
                Severity.HIGH,
                f"Khasra '{key}' appears on {len(entries)} parcels in the same record.",
                {"khasra": key, "occurrences": entries},
                "duplicate_khasra",
            )
        )
    return issues


# --------------------------------------------------------------------------- #
# Rule 4 - mutation inconsistency
# --------------------------------------------------------------------------- #


def _mutation_reference(field: Any) -> dict[str, str]:
    """Pull a mutation number/date out of a structured or free-text field."""
    data = _mapping(field)
    result: dict[str, str] = {}
    for key, target in (
        ("mutation_number", "number"),
        ("number", "number"),
        ("mutation_date", "date"),
        ("date", "date"),
    ):
        value = _value(data.get(key))
        if value:
            result[target] = _norm_text(value)

    text = _norm_text(field)
    if not text:
        return result
    if re.fullmatch(r"[a-z0-9][a-z0-9./-]{1,31}", text):
        result.setdefault("number", text)
        return result

    number_match = re.search(
        r"\bmutation\s*(?:no|number)?\s*[:#-]?\s*([a-z0-9][a-z0-9./-]+)", text
    )
    if number_match:
        result.setdefault("number", number_match.group(1))
    date_match = re.search(
        r"\b(?:mutation\s*)?dated?\s*[:#-]?\s*(\d{4}[-/]\d{1,2}[-/]\d{1,2})", text
    )
    if date_match:
        result.setdefault("date", date_match.group(1))
    return result


def detect_mutation_conflicts(analysis: Any) -> list[ConflictIssue]:
    """Flag contradictory mutation references, or warn when details are absent.

    A present mutation reference with no details is a warning (``LOW``), not a
    contradiction.
    """
    metadata = _metadata(analysis)
    number_field = metadata.get("mutation_number")
    date_field = metadata.get("mutation_date")
    details_field = metadata.get("mutation_details")

    number_values = _distinct(_field_variants(number_field))
    date_values = _distinct(_field_variants(date_field))

    evidence = {
        "mutation_number": _field_evidence("mutation_number", number_field),
        "mutation_date": _field_evidence("mutation_date", date_field),
        "mutation_details": _field_evidence("mutation_details", details_field),
    }

    contradictions: list[str] = []
    if len(number_values) > 1:
        contradictions.append("mutation_number")
    if len(date_values) > 1:
        contradictions.append("mutation_date")

    details_reference = _mutation_reference(details_field)
    number = _norm_text(number_field) if number_values else ""
    date = _norm_text(date_field) if date_values else ""
    if number and details_reference.get("number") and number != details_reference["number"]:
        contradictions.append("mutation_details.mutation_number")
    if date and details_reference.get("date") and date != details_reference["date"]:
        contradictions.append("mutation_details.mutation_date")

    if contradictions:
        evidence["contradictory_fields"] = sorted(set(contradictions))
        return [
            _issue(
                "mutation",
                IssueType.MUTATION_CONFLICT,
                Severity.HIGH,
                "Mutation reference, date, or structured details contradict each other.",
                evidence,
                "mutation_inconsistency",
            )
        ]

    if (number or date) and not _value(details_field):
        return [
            _issue(
                "mutation_details",
                IssueType.MUTATION_CONFLICT,
                Severity.LOW,
                "Mutation reference or date is present but mutation details are missing.",
                evidence,
                "mutation_inconsistency",
            )
        ]

    return []


# --------------------------------------------------------------------------- #
# Rule 5 - mandatory field checks
# --------------------------------------------------------------------------- #


def _missing_issue(
    field: str,
    expected: str,
    evidence: dict[str, Any],
    severity: Severity = Severity.HIGH,
) -> ConflictIssue:
    return _issue(
        field,
        IssueType.MISSING_MANDATORY,
        severity,
        f"Mandatory field '{field}' is missing.",
        {"expected": expected, **evidence},
        "mandatory_field_check",
    )


def detect_missing_mandatory_fields(
    analysis: Any,
    mandatory_fields: Optional[Sequence[str]] = None,
) -> list[ConflictIssue]:
    """Flag absent mandatory metadata, owner names, Khasra numbers, and areas."""
    required = tuple(mandatory_fields or DEFAULT_MANDATORY_FIELDS)
    metadata = _metadata(analysis)
    issues: list[ConflictIssue] = []

    for field_name in required:
        field = metadata.get(field_name)
        if not _value(field):
            issues.append(
                _missing_issue(
                    field_name, "non-empty value", _field_evidence(field_name, field)
                )
            )

    holders = _holders(analysis)
    if not holders:
        issues.append(
            _missing_issue(
                "landholders.name",
                "at least one owner",
                {"value": None, "provenance": {}},
            )
        )
    else:
        for index, holder in enumerate(holders):
            field = _get_field(holder, "name")
            if not _value(field):
                label = f"landholders[{index}].name"
                issues.append(
                    _missing_issue(
                        label, "non-empty owner name", _field_evidence(label, field)
                    )
                )

    for index, parcel in enumerate(_parcels(analysis)):
        khasra = _get_field(parcel, "khasra_number")
        if not _value(khasra):
            label = f"parcels[{index}].khasra_number"
            issues.append(
                _missing_issue(
                    label, "non-empty Khasra number", _field_evidence(label, khasra)
                )
            )

        area = _get_field(parcel, "area_raw")
        normalized = _get_field(parcel, "area_normalized")
        if not (_value(area) or _value(normalized)):
            label = f"parcels[{index}].area"
            issues.append(
                _missing_issue(
                    label,
                    "area value",
                    {
                        "value": None,
                        "provenance": _safe(_provenance(area) or _provenance(normalized)),
                    },
                )
            )

    return issues


# --------------------------------------------------------------------------- #
# Rule 6 - preserve AI-reported extraction conflicts
# --------------------------------------------------------------------------- #


def preserve_ai_extraction_conflicts(analysis: Any) -> list[ConflictIssue]:
    """Carry forward conflicts already reported by the AI extraction stage.

    Evidence and provenance are passed through untouched and tagged with
    ``source: "ai"`` so downstream consumers can tell engine findings from
    extractor findings.
    """
    conflicts = _extraction(analysis).get("conflicts", [])
    if not isinstance(conflicts, list):
        return []

    issues: list[ConflictIssue] = []
    for index, conflict in enumerate(conflicts):
        if not isinstance(conflict, dict):
            continue
        issue_type = (
            conflict.get("issue_type")
            or conflict.get("type")
            or IssueType.AI_EXTRACTION_CONFLICT.value
        )
        message = conflict.get("message") or json.dumps(
            _safe(conflict), default=str, sort_keys=True
        )
        evidence = _safe(conflict)
        if not isinstance(evidence, dict):
            evidence = {"value": evidence}
        evidence["source"] = "ai"
        evidence["ai_conflict_index"] = index
        evidence.setdefault("provenance", _safe(conflict.get("provenance", {})))
        issues.append(
            ConflictIssue(
                field=conflict.get("field"),
                issue_type=issue_type,
                severity=coerce_severity(conflict.get("severity"), Severity.MEDIUM),
                message=str(message),
                evidence=evidence,
                rule="ai_extraction_conflict",
            )
        )
    return issues


# --------------------------------------------------------------------------- #
# Aggregation
# --------------------------------------------------------------------------- #


def detect_conflicts(analysis: Any) -> list[ConflictIssue]:
    """Run every rule in canonical order and concatenate the results."""
    return [
        *detect_owner_conflicts(analysis),
        *detect_area_conflicts(analysis),
        *detect_duplicate_khasra(analysis),
        *detect_mutation_conflicts(analysis),
        *detect_missing_mandatory_fields(analysis),
        *preserve_ai_extraction_conflicts(analysis),
    ]


def run_rule(
    rule_name: str,
    analysis: Any,
    mandatory_fields: Optional[Sequence[str]] = None,
) -> list[ConflictIssue]:
    """Run a single rule by name."""
    normalized = (rule_name or "").strip().lower().replace("-", "_")
    rules: dict[str, Any] = {
        "all": detect_conflicts,
        "owner_conflict": detect_owner_conflicts,
        "owner_contradiction": detect_owner_conflicts,
        "owner_mismatch": detect_owner_conflicts,
        "area_conflict": detect_area_conflicts,
        "area_contradiction": detect_area_conflicts,
        "area_mismatch": detect_area_conflicts,
        "duplicate_khasra": detect_duplicate_khasra,
        "mutation_conflict": detect_mutation_conflicts,
        "mutation_inconsistency": detect_mutation_conflicts,
        "missing_mandatory": detect_missing_mandatory_fields,
        "mandatory_field_check": detect_missing_mandatory_fields,
        "ai_extraction_conflict": preserve_ai_extraction_conflicts,
        "preserve_ai_conflicts": preserve_ai_extraction_conflicts,
    }
    rule = rules.get(normalized)
    if rule is None:
        raise ValueError(f"Unknown conflict rule: {rule_name}")
    if normalized in ("missing_mandatory", "mandatory_field_check"):
        return list(rule(analysis, mandatory_fields))
    return list(rule(analysis))


__all__ = [
    "AREA_UNIT_ALIASES",
    "DEFAULT_MANDATORY_FIELDS",
    "detect_area_conflicts",
    "detect_conflicts",
    "detect_duplicate_khasra",
    "detect_missing_mandatory_fields",
    "detect_mutation_conflicts",
    "detect_owner_conflicts",
    "preserve_ai_extraction_conflicts",
    "run_rule",
]
