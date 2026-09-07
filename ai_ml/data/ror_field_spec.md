# Record of Rights (RoR) Field Specification

This document defines the preliminary field specification for the
Rajasthan Jamabandi / Record of Rights (RoR) format used in this project.

This is a reference for manual annotation and future extraction schema design.
Actual fields may vary by state, district, and year. Verify against real
documents before finalizing extractors.

For detailed layout, OCR challenges, and pipeline recommendations, see
`jamabandi_analysis.md`.

## Core Fields

These fields are expected to be present in most RoR documents.

| Field | Description | Example |
|---|---|---|
| document_id | Unique record/document identifier | RJ-JPR-2024-001 |
| state | State name | Rajasthan |
| district | District name | Jaipur |
| tehsil | Tehsil / sub-district | Jaipur |
| village | Village / Mouja name | Amer |
| khata_number | Khata / account number | 123 |
| khewat_number | Khewat / ownership account number | 45 |
| khatoni_number | Khatoni / holding number within Khewat | 12 |
| khasra_number | Khasra / survey number | 456/1 |
| landholder_name | Name of the landholder / owner | Ramesh Kumar |
| area | Area of the land with unit | 2.5 Bigha |
| area_raw | Raw area string as printed | 2-5-10 |
| land_classification | Type of land (irrigated / unirrigated / barren) | Irrigated |
| irrigation_source | Source of irrigation | Tubewell |
| cultivator_name | Name of cultivator if different from owner | Suresh Kumar |
| revenue_amount | Land revenue / rent amount | 500 INR |

## Optional Fields

These fields may appear depending on the document type and state.

| Field | Description | Example |
|---|---|---|
| mutation_number | Mutation / transfer reference | MUT-789 |
| mutation_date | Date of mutation | 2023-04-15 |
| mutation_notes | Mutation-related remarks | ... |
| co_owner_names | Names of co-owners or tenants | ["Suresh Kumar", "Rahul"] |
| tenancy_details | Tenancy or lease information | Annual lease |
| social_classification | Social classification as recorded | ... |
| remarks | Free-text remarks or legal notes | ... |
| year | Patwari / revision year | 2023-24 |
| document_type | Document type | khata |
| state_specific_fields | Extensible mapping for state-specific fields | { ... } |

## Hindi Labels (Rajasthan Form P-26 Reference)

The following Hindi labels are commonly observed in Rajasthan Jamabandi
documents (Form P-26). Exact wording should be verified against real forms.

| English field | Likely Hindi label (Devanagari) |
|---|---|
| New Khewat / Khatauni Number | नया खेवट / खतौनी संख्या |
| Old Khewat / Khatauni Number | पुराना खेवट / खतौनी संख्या |
| Name of tenant / owner | खातेदार का नाम |
| Father's / husband's name | पिता / पति का नाम |
| Caste | जाति |
| Address | पता |
| Khasra Number | खसरा संख्या |
| Area | रकबा / क्षेत्रफल |
| Social classification | सामाजिक वर्गीकरण |
| Source of irrigation | सिंचाई का स्रोत |
| Rent paid by cultivator | कृषक द्वारा भुगतान किया गया किराया |
| Mutation note | नामांतरण संबंधी नोट |
| Remarks | विवरण / टिप्पणी |

## Extensibility

The core extraction schema must support state-specific extensions without
breaking backward compatibility. Use an extensible mapping for optional or
state-specific fields rather than hard-coding every possible key.

## Assumptions Requiring Verification

- Field labels and exact column order in actual Jamabandi documents.
- Devanagari vs bilingual or English-only formats.
- Presence of digital signatures, QR codes, or ULPIN references.
- Multi-page document structure and whether khasra numbers repeat across pages.
- Consistency of units (Bigha, Biswa, Biswansi, etc.) across tehsils.
- Whether Khewat and Khatauni are always present or interchangeable.
- Exact format of area strings (e.g. `2-5-10` vs `2.5 Bigha`).
