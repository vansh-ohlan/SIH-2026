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

### Label-Based Extraction (`LabelExtractor`)

The first implemented strategy is deterministic label-based extraction.

#### What it does

- Scans OCR text for known Hindi/English field labels.
- Extracts values from the same line after the label, or from the immediately following line.
- Creates `ExtractedField` objects with full provenance metadata.
- Supports multiple pages, repeated labels, and mixed Hindi/English text.

#### Supported labels

| Field | English variants | Hindi variants |
|---|---|---|
| state | state | राज्य |
| district | district | जिला |
| tehsil | tehsil | तहसील |
| village | village | ग्राम |
| year | year | साल |
| khata_number | khata number | खाता संख्या |
| khewat_number | khewat number | खेवट संख्या |
| khatoni_number | khatoni number | खतौनी संख्या |
| khasra_number | khasra number | खसरा संख्या |
| landholder_name | name of owner | खातेदार का नाम |
| father_or_husband_name | father name | पिता का नाम |
| address | address | पता |
| area | area | रकबा |
| land_classification | land classification | सामाजिक वर्गीकरण |
| irrigation_source | irrigation source | सिंचाई का स्रोत |
| revenue | revenue | राजस्व |
| mutation_number | mutation number | नामांतरण संख्या |
| mutation_details | mutation details | नामांतरण विवरण |
| remarks | remarks | विवरण |

#### What it intentionally does NOT do

- Does not perform fuzzy matching.
- Does not guess values when labels are ambiguous.
- Does not parse tables or rely on spatial layout.
- Does not transliterate Hindi text.
- Does not perform unit conversion.
- Does not use ML or LLM inference.

#### Confidence behavior

- **Same-line label/value**: extraction confidence = 0.9 (high).
- **Next-line value**: extraction confidence = 0.6 (lower).
- **OCR confidence** is preserved from the OCR engine.
- **Extraction confidence** reflects the quality of the label/value association, not OCR quality.

#### Limitations

- Label matching is exact/normalized; it does not handle misspelled or heavily distorted labels.
- Value extraction is limited to the same line or the immediately following line.
- Does not group extracted fields into parcels automatically beyond basic list appending.
- Does not handle multi-line owner names unless they appear on a single line.
- Table structure detection is not implemented.

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
