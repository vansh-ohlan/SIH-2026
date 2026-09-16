# Conflict & Reconciliation Engine

## Overview

The Conflict & Reconciliation Engine turns an AI extraction result into an
auditable list of contradictions and completeness gaps in a land record.

It is **deterministic and rule-based**. No LLM or model inference runs inside
the engine — every finding comes from a pure Python rule over extracted values
and their provenance. The same input always produces the same findings, in the
same order, with the same evidence.

```
backend/app/services/conflict/
├── issue_types.py   ConflictIssue, IssueType, Severity
├── rules.py         the six detection rules
├── engine.py        ConflictEngine: run -> deduplicate -> sort
└── reporting.py     build_conflict_report(): API payload shape
```

## Rule catalogue

| Rule | `issue_type` | Severity | Fires when |
| --- | --- | --- | --- |
| `owner_contradiction` | `owner_mismatch` | `high` | The same owner name appears more than once **and** the entries disagree on `father_or_husband_name` or `share`. |
| `owner_contradiction` | `owner_mismatch` | `medium` | Independent extractors (different `extraction_method` in provenance) returned different owner names for the same `source_field`. |
| `area_contradiction` | `area_mismatch` | `high` | Two or more parcels share an explicitly recognized `area_unit` but carry different area values. |
| `duplicate_khasra` | `duplicate_khasra` | `high` | A normalized Khasra number appears on more than one parcel of the same record. |
| `mutation_inconsistency` | `mutation_conflict` | `high` | `mutation_number`/`mutation_date` carry multiple values, or `mutation_details` contradicts them. |
| `mutation_inconsistency` | `mutation_conflict` | `low` | A mutation reference or date exists but `mutation_details` is absent. **Warning, not a contradiction.** |
| `mandatory_field_check` | `missing_mandatory` | `high` | A mandatory metadata field (default: `khata_number`), an owner name, a Khasra number, or a parcel area is missing. |
| `ai_extraction_conflict` | *(as reported)* | *(as reported)* | The AI extraction stage already reported a conflict. Carried through unchanged. |

Rules always run in the order above; see [Ordering](#ordering-and-deduplication)
for how that interacts with severity.

### Deliberate non-rules

These are **not** conflicts, because treating them as such produces false
positives that erode trust in every real finding:

- **A repeated owner name alone.** Joint ownership and family holdings
  legitimately repeat a name. Only *contradictory attributes* on that repeated
  name are reported.
- **Area values without an explicit unit.** A bare `100` is never assumed to be
  square metres, hectares, or bighas. Parcels whose `area_unit` is missing or
  unrecognized are skipped entirely, and no cross-unit conversion is ever
  applied. Recognized units are listed in `AREA_UNIT_ALIASES` in `rules.py`.
- **Low AI confidence.** A poor `confidence_score` or a `high` `extraction_risk`
  is a signal reported in the `assessment` block, never a conflict finding.
- **Missing mutation details.** Reported at `low` severity as a completeness
  warning, not as a contradiction.

## Severity model

`low` < `medium` < `high` < `critical` (`Severity` in `issue_types.py`).

Severity is assigned per rule as shown in the catalogue. For findings carried
through from the AI stage, the reported severity is used; an unrecognized value
falls back to `medium` rather than being dropped.

## Ordering and deduplication

`ConflictEngine.run()` returns findings sorted by:

1. **severity**, most severe first
2. **rule order**, as declared in `RULE_ORDER`
3. **field**, then **issue type**, then **message**, then canonical evidence

Deduplication happens before sorting. Two findings are duplicates only when
*source, issue type, field, message, and evidence* all match — so two distinct
problems on the same field are both kept.

Because every key is total and deterministic, response ordering is stable across
processes and restarts. This is asserted by
`backend/tests/test_conflicts.py::TestEngineOrdering`.

## Evidence and provenance

Every finding carries an `evidence` object holding the values that motivated it
**and the provenance recorded at extraction time**. Provenance is preserved, not
restated: the engine copies the extractor's `provenance` block verbatim.

```json
{
  "field": "landholders.name",
  "issue_type": "owner_mismatch",
  "severity": "high",
  "message": "Repeated owner name has contradictory identity or share attributes.",
  "rule": "owner_contradiction",
  "evidence": {
    "owner_name": "ramesh kumar",
    "owners": [
      {
        "index": 0,
        "name": "Ramesh Kumar",
        "father_or_husband_name": "Suresh Kumar",
        "share": "0.5",
        "provenance": {
          "page": 1,
          "bbox": [10, 20, 30, 40],
          "extraction_method": "pattern"
        }
      },
      {
        "index": 1,
        "name": "Ramesh Kumar",
        "father_or_husband_name": "Suresh Kumar",
        "share": "0.25",
        "provenance": {}
      }
    ],
    "reason": "same_owner_different_attributes",
    "contradictory_attributes": ["share"]
  }
}
```

Findings from the AI stage are additionally tagged so consumers can tell the two
apart:

```json
"evidence": {
  "source": "ai",
  "ai_conflict_index": 0,
  "provenance": { "page": 3, "bbox": [1, 2, 3, 4] }
}
```

## API

### `GET /api/v1/records/{record_id}/conflicts`

Runs the engine over one persisted land record.

```json
{
  "record_id": 1,
  "total": 5,
  "severity_counts": { "low": 1, "medium": 0, "high": 3, "critical": 1 },
  "conflicts": [
    {
      "field": "area",
      "issue_type": "area_mismatch",
      "severity": "critical",
      "message": "Area mismatch between RoR and map",
      "rule": "ai_extraction_conflict",
      "evidence": {
        "field": "area",
        "type": "area_mismatch",
        "severity": "critical",
        "message": "Area mismatch between RoR and map",
        "provenance": { "page": 3, "bbox": [1, 2, 3, 4] },
        "source": "ai",
        "ai_conflict_index": 0
      }
    }
  ]
}
```

- `200` with the report. An empty `conflicts` array is a valid, meaningful
  result — it means the record reconciles cleanly.
- `404` when `record_id` does not exist:
  `{"detail": {"error": "not_found", "message": "..."}}`

**Recomputed on read.** Findings are not served from the stored `conflicts`
rows; the engine runs on every request. A record persisted with one AI-reported
conflict therefore returns that conflict *plus* whatever the rule set finds.
This keeps responses consistent with the current rules without a data migration.

Input resolution, in `load_record_analysis()`:

1. `LandRecord.raw_analysis` when present — richest, retains every field
   wrapper and its full provenance.
2. Otherwise a view rebuilt from the relational rows
   (`record_to_extraction()`), restoring provenance from the `provenance`
   columns and from stored conflict evidence.

### `GET /api/v1/land/{ulpin}`

The Unified Land Intelligence API embeds the same conflict report under
`conflicts`. See [ulpin-retrieval.md](./ulpin-retrieval.md).

## Extending the engine

Add a rule by writing a pure function `analysis -> list[ConflictIssue]` in
`rules.py`, then:

1. Append it to `DEFAULT_RULES` in `engine.py`.
2. Give it an entry in `RULE_ORDER` so its position is deterministic.
3. Reuse `_field_evidence()` so provenance is preserved.
4. Add positive **and** negative tests in `backend/tests/test_conflicts.py`.

A rule must never mutate its input, read the database, or depend on wall-clock
time or randomness.

Named rules can be selected explicitly, which is useful for targeted jobs:

```python
from backend.app.services.conflict import ConflictEngine

ConflictEngine(rules=["owner_contradiction", "duplicate_khasra"]).run(analysis)
ConflictEngine(mandatory_fields=("khata_number", "khewat_number")).run(analysis)
```

## Testing

```bash
pytest backend/tests/test_conflicts.py          # rules + ordering (55 tests)
pytest backend/tests/test_land_intelligence.py  # API integration (25 tests)
```
