# Extraction Module

This module defines the architecture and structured schema for extracting
land-record fields from OCR-processed Rajasthan Jamabandi / Record of Rights
(RoR) documents.

## Purpose

The extraction layer maps OCR results to structured, auditable land-record
data. It is intentionally conservative: missing fields are represented as
`None`, not guessed, and every extracted value carries provenance metadata.

## Architecture

```
OCRResult (post-processed)
    ↓
ExtractionStrategy.extract()
    ↓
ExtractionResult
    ↓
RoRRecord with field-level provenance
    ↓
future validation / anomaly detection
```

## Extraction Schema

### Core Record: `RoRRecord`

```python
class RoRRecord(BaseModel):
    metadata: RoRMetadata
    landholders: list[Landholder]
    parcels: list[Parcel]
    document_remarks: Optional[ExtractedField]
    unrecognized_text: list[str]
    warnings: list[str]
```

### Document Metadata: `RoRMetadata`

Contains document-level fields:
- `document_id`, `state`, `district`, `tehsil`, `village`
- `year`, `document_type`
- `khata_number`, `khewat_number`, `khatoni_number`
- `mutation_number`, `mutation_date`, `mutation_details`
- `state_specific_fields: dict[str, Any]` — extensible mapping

### Landholders: `Landholder`

Represents one owner/co-owner:
- `name`
- `father_or_husband_name`
- `caste`
- `address`
- `share`
- `is_cultivator`

### Parcels: `Parcel`

Represents one Khasra/plot entry:
- `khasra_number`
- `area_raw` — exact string from OCR (e.g., `"2-5-10"`)
- `area_normalized` — future normalized value
- `area_unit` — e.g., Bigha, Biswa, Hectare
- `land_classification`
- `land_type`
- `cultivation_status`
- `irrigation_source`
- `revenue`
- `remarks`

### ExtractedField

Every field value is wrapped in `ExtractedField`, which carries optional
`FieldProvenance` metadata:
- `source_ocr_text` — raw OCR text
- `source_bbox` — bounding box
- `page_number`
- `ocr_confidence` — OCR engine confidence
- `extraction_confidence` — confidence in the extraction mapping
- `extraction_method` — LABEL, REGEX, SPATIAL, TABLE, ML, LLM, MANUAL, UNKNOWN
- `extractor_version`
- `notes`

## Confidence Model

Two distinct confidence values are tracked:

1. **OCR confidence** — from the OCR engine: how well was the text recognized?
2. **Extraction confidence** — from the extractor: how confident are we that we mapped the text to the correct field?

These are kept separate to support downstream debugging and validation.

## Extraction Strategies

Future extraction strategies will subclass `ExtractionStrategy`:

```python
class MyStrategy(ExtractionStrategy):
    def extract(self, ocr_result, config=None) -> ExtractionResult:
        ...
```

Planned strategies:
- **Label-based** — find values near known Hindi/English labels
- **Regex/pattern** — match known patterns (khasra numbers, area notation, dates)
- **Spatial/layout** — use bounding box positions relative to document regions
- **Table-aware** — exploit table structure from PP-StructureV3 or similar
- **ML/LLM-assisted** — future enhancement using trained models

No strategy is implemented in this task.

## Hindi-First Design

The schema supports:
- Hindi field labels and Devanagari values
- English text and abbreviations
- Mixed Hindi/English/numeric content
- Numeric identifiers (khata, khasra, revenue)
- Fractional area notation (Bigha/Biswa/Biswansi)
- Dates in multiple formats

No transliteration or aggressive normalization is applied at the schema level.

## Repeated Parcels

A single `RoRRecord` can contain multiple `Parcel` entries. This matches
the Jamabandi structure where one Khata/Khewat may contain several Khasras.

## Area Handling

- `area_raw` preserves the exact OCR string (e.g., `"2-5-10"`)
- `area_normalized` is reserved for future normalization
- No legal unit conversion is performed at extraction time

## Error Handling

- `ExtractionError` — base exception
- `InvalidOCRResultError` — malformed OCR input
- `UnsupportedDocumentError` — unsupported document structure
- `ExtractionFailureError` — extraction failed
- `ExtractionConfigurationError` — invalid configuration

Errors are never silently swallowed; failed extraction returns
`ExtractionResult(status="failure")` with warnings.

## Limitations

- No actual extraction logic is implemented yet.
- No regex patterns, label dictionaries, or ML models are included.
- Table structure detection is not implemented here.
- No Devanagari-specific label matching is included.
- Area normalization is not performed.
