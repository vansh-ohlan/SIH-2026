"""Conflict & Reconciliation Engine for land-record extraction.

Deterministic, rule-based conflict detection. No LLM / no AI model inference
is performed here: every check is a pure Python rule over extracted values
and their provenance metadata.

The engine is side-effect free. It accepts a normalized extraction (the shape
produced by ``analysis_to_land_record`` in ``backend.app.repositories``) and
returns deduplicated, deterministically ordered ``ConflictIssue`` objects that
callers can persist on the ``LandRecord.conflicts`` relation or return from the
API.
"""

from __future__ import annotations

from backend.app.services.conflict.engine import (
    DEFAULT_RULES,
    RULE_ORDER,
    ConflictEngine,
    deduplicate_issues,
    severity_counts,
    sort_issues,
)
from backend.app.services.conflict.issue_types import (
    SEVERITY_ORDER,
    ConflictIssue,
    IssueType,
    Severity,
)
from backend.app.services.conflict.rules import (
    DEFAULT_MANDATORY_FIELDS,
    detect_conflicts,
    run_rule,
)
from backend.app.services.conflict.reporting import build_conflict_report

__all__ = [
    "DEFAULT_MANDATORY_FIELDS",
    "DEFAULT_RULES",
    "RULE_ORDER",
    "SEVERITY_ORDER",
    "ConflictEngine",
    "ConflictIssue",
    "IssueType",
    "Severity",
    "build_conflict_report",
    "deduplicate_issues",
    "detect_conflicts",
    "run_rule",
    "severity_counts",
    "sort_issues",
]
