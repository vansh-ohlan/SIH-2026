"""Conflict issue types, severities, and the shared issue dataclass.

Every conflict produced by the Conflict & Reconciliation Engine is represented
as a :class:`ConflictIssue`. The dataclass is intentionally lightweight and
JSON-serializable so it can be stored on the ``Conflict.evidence`` column or
returned directly from the API.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Optional


class IssueType(str, Enum):
    """Catalogue of deterministic conflict types produced by the engine."""

    OWNER_MISMATCH = "owner_mismatch"
    AREA_MISMATCH = "area_mismatch"
    DUPLICATE_KHASRA = "duplicate_khasra"
    MUTATION_CONFLICT = "mutation_conflict"
    MISSING_MANDATORY = "missing_mandatory"
    AI_EXTRACTION_CONFLICT = "ai_extraction_conflict"

    def __str__(self) -> str:
        return self.value


class Severity(str, Enum):
    """Explainable severity levels ordered by impact."""

    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

    def __str__(self) -> str:
        return self.value


SEVERITY_ORDER: dict[Severity, int] = {
    Severity.LOW: 0,
    Severity.MEDIUM: 1,
    Severity.HIGH: 2,
    Severity.CRITICAL: 3,
}


def coerce_severity(value: Any, default: Severity = Severity.MEDIUM) -> Severity:
    """Normalize a severity value (enum, str, or None) to a Severity member."""
    if isinstance(value, Severity):
        return value
    if value is None:
        return default
    text = str(value).strip().lower()
    for member in Severity:
        if member.value == text:
            return member
    return default


@dataclass
class ConflictIssue:
    """A single detected conflict with full evidence/provenance.

    Attributes:
        field: The record field the conflict concerns (may be None).
        issue_type: One of the :class:`IssueType` string values.
        severity: One of the :class:`Severity` string values.
        message: Human-readable explanation of the conflict.
        evidence: JSON-serializable evidence block preserving values and
            provenance that motivated the finding.
        rule: Name of the deterministic rule that produced the issue.
    """

    field: Optional[str]
    issue_type: str
    severity: str
    message: str
    evidence: dict[str, Any] = field(default_factory=dict)
    rule: Optional[str] = None

    def __post_init__(self) -> None:
        if isinstance(self.issue_type, IssueType):
            self.issue_type = self.issue_type.value
        elif self.issue_type is not None:
            self.issue_type = str(self.issue_type)
        self.severity = coerce_severity(self.severity).value
        if self.evidence is None:
            self.evidence = {}

    def to_dict(self) -> dict[str, Any]:
        """Return a JSON-serializable representation."""
        return {
            "field": self.field,
            "issue_type": self.issue_type,
            "severity": self.severity,
            "message": self.message,
            "evidence": self.evidence,
            "rule": self.rule,
        }

    def dedupe_key(self) -> tuple[str, str]:
        """Return ``(field, issue_type)`` used to dedupe merged conflicts."""
        return (self.field or "", self.issue_type)
