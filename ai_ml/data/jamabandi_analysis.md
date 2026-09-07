# Rajasthan Jamabandi / Record of Rights — Document Analysis

_This document is based on publicly available references about the Rajasthan
Jamabandi / Record of Rights (RoR). It is intended for internal planning and
pipeline design only. It does not reproduce any real personal data. Exact field
labels, ordering, and presence should be verified against physical documents
before the extraction pipeline is finalized._

## 1. Document Overview

### What it represents

A Rajasthan Jamabandi (also called Record of Rights, RoR, or Nakal) is the
official revenue record maintained by the Revenue Department under the
Rajasthan Land Revenue Act, 1956. It records who the government revenue system
currently recognises as owner or cultivator of each plot in a village, together
with the area, land type, irrigation source, and any encumbrances or mutations.

It is a **revenue record, not a title document**. Legal title requires a
registered sale deed in addition to the Jamabandi.

### Typical format

- The physical document is typically a **multi-page register** or a printed
  extract / Nakal.
- The standard form is **Form P-26(A)** / **Form P-26(B)** (Khewat Khatauni).
- It is often printed on **pre-printed government stationery** with fixed
  column headers.
- Digital copies are available as PDF from the Apna Khata portal.

### Language and script

- **Primary language:** Hindi.
- **Script:** Devanagari.
- Some digital or certified copies may include **English labels or bilingual
  headers**, especially for computer-printed extracts.
- Field values are overwhelmingly in **Hindi / Devanagari** for owner names,
  village names, and land classifications.

### Multi-page nature

- A single Jamabandi extract may cover **one Khata (account)** or **one
  Khasra (plot)** per page, but larger extracts can span multiple pages if a
  landholder owns several plots.
- Each page typically repeats the header (district, tehsil, village, year).

---

## 2. Field Analysis

The table below documents the **10 columns** commonly found in Rajasthan
Jamabandi (Form P-26). Labels are derived from public descriptions; exact
Devanagari wording must be verified against a real printed form.

| # | Hindi label (likely) | English meaning | Expected type | Mandatory / optional | Typical position | OCR / extraction difficulty |
|---|----------------------|-----------------|---------------|----------------------|------------------|-----------------------------|
| 1 | नया खेवट / खतौनी संख्या | New Khewat / Khatauni Number | Integer / string | Mandatory | Top header / first column | Low |
| 2 | पुराना खेवट / खतौनी संख्या | Old Khewat / Khatauni Number | Integer / string | Optional (blank if new) | Second column | Low |
| 3 | खातेदार का नाम, पिता / पति का नाम, जाति, पता | Name of tenant / owner, father's / husband's name, caste, address | String (multi-line) | Mandatory | Third column; often spans multiple lines | Medium–High (handwriting, long names, mixed Hindi/English) |
| 4 | खसरा संख्या | Khasra / Survey Number | String (e.g. 142/1, 247/2/3) | Mandatory | Fourth column | Low–Medium (fractions, slashes) |
| 5 | रकबा / क्षेत्रफल | Area | String with unit (Bigha, Biswa, Biswansi, Hectare) | Mandatory | Fifth column | Medium (fractional values, mixed units) |
| 6 | सामाजिक वर्गीकरण | Social / land classification | String (e.g. Irrigated, Unirrigated, Barren) | Mandatory | Sixth column | Medium (domain-specific Hindi terms) |
| 7 | सिंचाई का स्रोत | Source of irrigation | String (e.g. Tubewell, Canal, Rainfed) | Mandatory or often present | Seventh column | Medium |
| 8 | कृषक द्वारा भुगतान किया गया किराया / राजस्व | Rent / revenue paid by cultivator | String / numeric | Mandatory | Eighth column | Medium (currency, fractions) |
| 9 | नामांतरण / Mutation संबंधी नोट | Mutation-related note with date and number | String / date | Optional | Ninth column | Medium (dates in multiple formats, red-ink annotations) |
| 10 | विवरण / टिप्पणी | Remarks | String | Optional | Tenth column | High (free text, stamps, abbreviations) |

### Additional fields observed in digital extracts

- **District** (जिला)
- **Tehsil** (तहसील)
- **Village** (ग्राम / मौजा)
- **Year / Patwari year** (साल)
- **Khata number** (खाता संख्या) — sometimes distinct from Khewat number
- **Khewat number** (खेवट संख्या) — ownership account number
- **Khatoni number** (खतौनी संख्या) — holding number within a Khewat
- **Cultivator name** (कृषक का नाम) — if different from owner
- **Share / Hissa** (हिस्सा) — fractional ownership share
- **Land type / Kism** (किस्म) — agricultural, non-agricultural, barren, pasture
- **Cultivation status** (खेती का स्थिति) — current crop or fallow
- **Encumbrance / lien details** (बाधा / lien)
- **Revenue amount** (राजस्व राशि)

> **Caveat:** The exact set of fields and their column order may vary by
> district, tehsil, and year. The list above is based on publicly available
> descriptions of Form P-26 and should be verified against actual documents
> before the extractor is finalized.

---

## 3. Table / Layout Analysis

### Header structure

- **Document header** (top of first page):
  - State name / emblem
  - "जमाबंदी" or "राजस्व अभिलेख"
  - District (जिला)
  - Tehsil (तहसील)
  - Village / Mouja (ग्राम / मौजा)
  - Patwari year or revision year
  - Form number (P-26)
- **Column headers** are printed in **Devanagari** and are usually repeated on
  every page.

### Rows and columns

- Each **row** corresponds to one **Khasra** entry under a given Khewat /
  Khatauni.
- A landholder with multiple plots will have **multiple rows**.
- Rows may be **split across pages** if the holder has many Khasras.

### Repeated fields

- Khewat / Khatauni number repeats for every row belonging to the same account.
- District, tehsil, village repeat in the header on every page.
- Owner name repeats for every row of the same holder.

### Merged cells

- Owner name cells may span **multiple rows** when the same owner holds
  several Khasras.
- Area cells may contain **fractional values** (e.g. `2-5-10` meaning
  2 Bigha, 5 Biswa, 10 Biswansi).

### Multi-line text

- Owner names with father's / husband's names and addresses can occupy
  **2–4 lines**.
- Remarks and mutation notes are often multi-line.
- Some cells use **tables within tables** for share calculations.

### Owner and parcel representation

- The document is **owner-centric**: rows are grouped by Khewat number, and
  each owner's holdings are listed below.
- Each row then maps that owner to a specific **Khasra** and area.

### Potential reading-order problems for OCR

- **Vertical Devanagari text** in headers or stamps.
- **Red-ink handwritten annotations** in the Remarks / Mutation columns.
- **Merged cells** breaking simple row-by-row extraction.
- **Page headers and footers** repeating and potentially confusing table
  detection.
- **Line-wrapped long names** causing a single logical field to span
  multiple OCR lines.
- **Mixed printed + handwritten** content in the same cell.

---

## 4. Non-Text Regions

| Region | Likely presence | Purpose / OCR impact |
|--------|-----------------|----------------------|
| QR code | Possible in digital / certified copies | Machine-readable verification; should be ignored by OCR or fed to a QR decoder |
| Stamps / seals | Very common | Official authentication; circular or rectangular; may overlap text; high OCR interference |
| Signatures | Common (Patwari, Tehsildar) | Handwritten or digital; not needed for field extraction but indicates document validity |
| Logos / emblems | Common (state emblem, Revenue Board) | Top corners; large graphics; should be masked or ignored |
| Borders / lines | Standard | Table borders; helpful for layout detection but may fragment text blocks |
| Handwritten annotations | Possible | Mutation entries, corrections, dates in red/blue ink; difficult for standard OCR |

---

## 5. OCR Challenges (Hindi / Devanagari Specific)

1. **Devanagari characters** — Complex conjunct consonants (e.g. `क्ष`, `त्र`,
   `श्र`); OCR models trained on printed Hindi perform better than generic
   models.
2. **Low-quality scans** — Faded print, bleed-through from the reverse page,
   coffee stains, fold marks.
3. **Skew / rotation** — Scanned pages may be rotated by a few degrees; deskew
   is essential before OCR.
4. **Table lines** — Horizontal and vertical rules may be detected as text or
   may split characters; preprocessing should preserve line structure.
5. **Overlapping text** — Stamps, seals, and handwritten notes may overlap
   printed text; a mask or inpainting step may help.
6. **Small fonts** — Fine print in column headers and footnotes.
7. **Stamps / seals** — Circular text and graphics interfere with layout
   analysis.
8. **Mixed Hindi / English / numeric content** — Numbers, dates, and codes
   appear alongside Devanagari; the OCR engine must handle mixed scripts.
9. **Land-area units** — Bigha, Biswa, Biswansi, Kanal, Marla, Hectare;
   numeric fractions and abbreviations are domain-specific.
10. **Long compound words** — Owner names and place names can be long and
    hyphenated across lines.

---

## 6. Extraction Requirements

### Preprocessing requirements

- Grayscale conversion and contrast enhancement.
- Denoising (Gaussian / median filter) for scanned paper texture.
- Deskewing to correct page rotation.
- Border / table-line removal or enhancement (depending on downstream table
  detector).
- Masking of large non-text regions (logos, seals) if they interfere with
  layout analysis.
- Resolution normalization (target ~300 DPI equivalent).

### OCR requirements

- **Primary engine:** PaddleOCR (strong Devanagari support, layout analysis).
- **Fallback engine:** Tesseract 5+ with Hindi language pack.
- Output should include **word-level bounding boxes and confidence scores**.
- Preserve **reading order** as much as possible; post-process to group lines
  into logical cells.

### Table / row extraction requirements

- Detect table structure from printed lines or whitespace alignment.
- Map each detected row to a **Khewat / Khatauni group**.
- Split multi-line cell text into single logical values.
- Handle **merged owner-name cells** by propagating the owner name down to
  all rows in the group.

### Field normalization requirements

- **Area normalization:** Convert local units to a canonical representation
  (e.g. `float` in Hectares, plus raw string).
- **Khasra normalization:** Keep raw string; validate format
  `^\d+(/\d+)*$` where applicable.
- **Name normalization:** Strip excess whitespace; preserve original case /
  script for human review.
- **Date normalization:** Convert `dd/mm/yyyy`, `yyyy-mm-dd`, or Devanagari
  numerals to ISO-8601 where possible.

### Confidence scoring requirements

- Per-field confidence derived from OCR word confidences.
- Lower confidence for:
  - Handwritten or red-ink text.
  - Stamps / seals overlapping fields.
  - Very short or ambiguous tokens.
- Store both **raw OCR confidence** and **adjusted field confidence**.

---

## 7. Dataset Implications

A future dataset for this pipeline should contain:

1. **Document images / PDFs**
   - Original scanned pages (lossless or high-quality JPEG/PNG).
   - Stored under `ai_ml/data/raw/ror/`.
2. **Preprocessed images**
   - Grayscale, denoised, deskewed versions.
   - Stored under `ai_ml/data/processed/`.
3. **Ground-truth structured JSON**
   - One file per document/page.
   - Contains extracted fields, normalized values, and per-field `confidence`
     and `source` annotations.
   - Stored under `ai_ml/data/ground_truth/`.
4. **OCR text**
   - Raw OCR output (words + bounding boxes + confidences).
   - Can be embedded in the ground-truth JSON or stored separately.
5. **Field-level annotations**
   - For each field: `value`, `normalized_value`, `confidence`,
     `extraction_method` (rule / ml / manual), `notes`.
6. **Document-level metadata**
   - `document_id`, `source`, `state`, `district`, `tehsil`, `village`,
     `document_type`, `language`, `script`, `file_type`,
     `acquisition_date`, `contains_personal_information`, `notes`.
7. **Synthetic samples**
   - Generated by `ai_ml/synthetic/generator.py`.
   - Clearly labeled with `"source": "synthetic"`.
   - Used for pipeline development when real samples are unavailable.

---

## 8. Recommended AI/ML Pipeline Changes

Based on this analysis, the planned pipeline should be updated as follows:

```
Scanned RoR
    ↓
Preprocessing
    - Grayscale, denoise, deskew
    - Mask large seals/logos if they interfere
    ↓
OCR (PaddleOCR preferred)
    - Word-level output with bounding boxes and confidences
    - Preserve reading order
    ↓
Post-processing
    - Merge hyphenated / line-wrapped words
    - Normalize Devanagari numerals and date formats
    ↓
Table / Layout Extraction
    - Detect rows and columns from lines / whitespace
    - Group rows by Khewat / Khatauni
    - Propagate merged owner names downward
    ↓
Field Extraction
    - Map each cell to a known field label
    - Apply regex + rule-based extractors for:
      Khasra number, area (Bigha/Biswa/Biswansi), dates, names
    - Output structured JSON aligned with RoR schema
    ↓
Confidence Scoring
    - Per-field confidence from OCR word confidences
    - Penalize fields overlapping stamps, seals, or handwriting
    - Flag fields needing manual review
    ↓
Rule-based Validation
    - Cross-check area totals across rows
    - Validate Khasra format
    - Ensure mandatory fields are present
    ↓
Anomaly Detection
    - Flag ownership shares that do not sum to expected total
    - Flag unusually large or small areas
    - Flag mismatched district/tehsil/village combinations
    - Provide explainable reasons for each flag
    ↓
Backend (advisory only)
    - Persist structured JSON, confidences, validation results, anomalies
    - Government officials review, verify, and approve changes
    - AI never silently overwrites official records
```

### Specific adjustments influenced by this analysis

1. **Preprocessing must include seal / stamp masking** because these are
   common and highly disruptive to OCR.
2. **OCR engine selection should prioritize Devanagari performance**; generic
   Latin-only engines are insufficient.
3. **Layout analysis must handle merged owner-name cells** and multi-line text.
4. **Area normalization must support Bigha / Biswa / Biswansi fractions**,
   which are non-trivial to parse.
5. **Confidence scoring must downgrade fields in red-ink or handwritten
   annotations**, because these are common in Mutation and Remarks columns.
6. **Validation rules should be state-specific**; Rajasthan-specific rules
   (e.g. mutation reference formats, revenue amounts) will differ from other
   states.
7. **Anomaly detection must be explainable**; each flag should reference the
   specific field, rule, and document section.

---

_This analysis is preliminary and based on publicly available descriptions of
Rajasthan Jamabandi documents. It should be validated against a small set of
legally obtained real samples before the extraction pipeline is implemented._
