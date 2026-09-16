"""Conflict & Reconciliation Engine orchestration.

The engine runs a fixed, ordered set of deterministic rules over an
extraction result, then deduplicates and sorts the findings so that the same
input always produces byte-identical output. Ordering is:

1. severity, most severe first
2. rule order, as declared in :data:`RULE_ORDER`
3. field, issue type, message, and canonical evidence as tie-breakers

No LLM or model inference is involved at any point.
"""

from __future__ import annotations

import json
from collections.abc import Callable, Iterable, Sequence
from typing import Any, Optional, Union

from backend.app.services.conflict.issue_types import (
    SEVERITY_ORDER,
    ConflictIssue,
    Severity,
    coerce_severity,
)
from backend.app.services.conflict.rules import (
    DEFAULT_MANDATORY_FIELDS,
    detect_area_conflicts,
    detect_duplicate_khasra,
    detect_missing_mandatory_fields,
    detect_mutation_conflicts,
    detect_owner_conflicts,
    preserve_ai_extraction_conflicts,
    run_rule,
)

#: A rule is either a callable taking the analysis, or a name resolved by
#: :func:`backend.app.services.conflict.rules.run_rule`.
ConflictRule = Union[Callable[[Any], Iterable[ConflictIssue]], str]

DEFAULT_RULES: tuple[Callable[[Any], list[ConflictIssue]], ...] = (
    detect_owner_conflicts,
    detect_area_conflicts,
    detect_duplicate_khasra,
    detect_mutation_conflicts,
    detect_missing_mandatory_fields,
    preserve_ai_extraction_conflicts,
)

#: Canonical rule ordering used as the secondary sort key.
RULE_ORDER: dict[str, int] = {
    "owner_contradiction": 0,
    "area_contradiction": 1,
    "duplicate_khasra": 2,
    "mutation_inconsistency": 3,
    "mandatory_field_check": 4,
    "ai_extraction_conflict": 5,
}

_UNKNOWN_RULE_ORDER = 99


def _canonical_evidence(issue: ConflictIssue) -> str:
    """Serialize evidence deterministically so it can be used as a sort key."""
    return json.dumps(issue.evidence or {}, sort_keys=True, default=str, ensure_ascii=False)


def deduplicate_issues(issues: Iterable[ConflictIssue]) -> list[ConflictIssue]:
    """Drop repeat findings, keeping the first occurrence in input order.

    Identity is the whole finding — source, type, field, message, and
    canonical evidence — so two issues that merely share a field are both kept.
    """
    result: list[ConflictIssue] = []
    seen: set[tuple[Any, ...]] = set()
    for issue in issues:
        if not isinstance(issue, ConflictIssue):
            continue
        source = (issue.evidence or {}).get("source") or issue.rule or "rule"
        key = (
            source,
            issue.issue_type,
            issue.field or "",
            issue.message,
            _canonical_evidence(issue),
        )
        if key in seen:
            continue
        seen.add(key)
        result.append(issue)
    return result


def sort_issues(issues: Iterable[ConflictIssue]) -> list[ConflictIssue]:
    """Sort findings by severity, then rule order, then stable tie-breakers."""

    def key(issue: ConflictIssue) -> tuple[Any, ...]:
        rank = SEVERITY_ORDER.get(coerce_severity(issue.severity), 0)
        return (
            -rank,
            RULE_ORDER.get(issue.rule or "", _UNKNOWN_RULE_ORDER),
            issue.field or "",
            issue.issue_type or "",
            issue.message or "",
            _canonical_evidence(issue),
        )

    return sorted(issues, key=key)


def severity_counts(issues: Iterable[ConflictIssue]) -> dict[str, int]:
    """Count findings per severity, always returning every severity key."""
    counts = {severity.value: 0 for severity in Severity}
    for issue in issues:
        counts[coerce_severity(issue.severity).value] += 1
    return counts


class ConflictEngine:
    """Runs the conflict rule set over an extraction result."""

    def __init__(
        self,
        rules: Optional[Sequence[ConflictRule]] = None,
        mandatory_fields: Optional[Sequence[str]] = None,
    ) -> None:
        self.rules: tuple[ConflictRule, ...] = (
            tuple(rules) if rules is not None else DEFAULT_RULES
        )
        self.mandatory_fields: tuple[str, ...] = (
            tuple(mandatory_fields)
            if mandatory_fields is not None
            else DEFAULT_MANDATORY_FIELDS
        )

    def run(self, analysis: Any) -> list[ConflictIssue]:
        """Detect, deduplicate, and order every conflict for ``analysis``."""
        issues: list[ConflictIssue] = []
        for rule in self.rules:
            issues.extend(self._apply(rule, analysis))
        return sort_issues(deduplicate_issues(issues))

    def _apply(self, rule: ConflictRule, analysis: Any) -> list[ConflictIssue]:
        if isinstance(rule, str):
            produced: Any = run_rule(rule, analysis, self.mandatory_fields)
        elif callable(rule):
            produced = rule(analysis)
        else:
            raise TypeError(
                f"Conflict rule must be callable or a rule name, got {type(rule).__name__}"
            )

        if produced is None:
            return []
        if isinstance(produced, ConflictIssue):
            return [produced]
        return [issue for issue in produced if isinstance(issue, ConflictIssue)]


__all__ = [
    "DEFAULT_RULES",
    "RULE_ORDER",
    "ConflictEngine",
    "ConflictRule",
    "deduplicate_issues",
    "severity_counts",
    "sort_issues",
]
