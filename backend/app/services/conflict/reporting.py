"""Serialization helpers for conflict engine output.

Keeps the API response shape in one place so every endpoint that exposes
reconciliation results reports an identical structure.
"""

from __future__ import annotations

from typing import Any, Sequence

from backend.app.services.conflict.engine import severity_counts
from backend.app.services.conflict.issue_types import ConflictIssue


def build_conflict_report(
    record_id: int,
    issues: Sequence[ConflictIssue],
) -> dict[str, Any]:
    """Build the conflict report payload for ``record_id``.

    The issue order is preserved exactly as the engine produced it, so the
    report is deterministic for a given input.
    """
    ordered = list(issues)
    return {
        "record_id": record_id,
        "total": len(ordered),
        "severity_counts": severity_counts(ordered),
        "conflicts": [issue.to_dict() for issue in ordered],
    }


__all__ = ["build_conflict_report"]
