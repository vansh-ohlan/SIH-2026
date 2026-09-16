/**
 * Bhu-Setu Land Knowledge Repository
 * Authoritative, citizen-accessible and officer-decision-support domain definitions.
 */

export interface LandTopic {
  id: string;
  title: string;
  keywords: string[];
  summary: string;
  detailedExplanation: string;
  citizenGuidance?: string;
  officerChecklist?: string[];
  category: "identity" | "records" | "gis" | "workflow" | "risk" | "audit";
}

export const LAND_KNOWLEDGE_TOPICS: LandTopic[] = [
  {
    id: "ulpid",
    title: "ULPID (Unique Land Parcel Identification Number) / Bhu-Aadhaar",
    keywords: ["ulpid", "bhu-aadhaar", "bhu aadhaar", "unique id", "parcel id", "14 digit", "identification", "bhu-setu id"],
    category: "identity",
    summary: "A national 14-digit alphanumeric unique identifier for every land parcel in India based on its geospatial coordinates.",
    detailedExplanation: `### What is ULPID?
The **Unique Land Parcel Identification Number (ULPID)**, often referred to as **Bhu-Aadhaar**, is a 14-digit alphanumeric identifier assigned to every georeferenced land parcel.

- **Geospatial Basis:** Generated deterministically using the longitude and latitude coordinates of the parcel's centroid and polygon vertices under the **EPSG:4326 (WGS 84)** standard.
- **Interoperability:** Serves as the single common primary key across siloed government departments (State Revenue/Jamabandi, Cadastral Survey/Bhu-Naksha, Registration/NGDRS, and Municipal Urban Planning).
- **Format Example:** \`PB-LDH-0042\` (State: Punjab, District: Ludhiana, Parcel: 0042).`,
    citizenGuidance: "You can find your ULPID on your latest digitized Record of Rights (Jamabandi/Bhulekh) or by searching your name/location on the Bhu-Setu portal.",
    officerChecklist: [
      "Confirm ULPID matches the surveyed PostGIS spatial boundary.",
      "Ensure no duplicate or overlapping ULPID polygons exist in the cadastre.",
      "Verify consistency across the State RoR index and NGDRS deed ledger."
    ]
  },
  {
    id: "ror",
    title: "Record of Rights (RoR) / Jamabandi / Bhulekh",
    keywords: ["ror", "record of rights", "jamabandi", "bhulekh", "patta", "chitta", "khasra", "khatauni", "khewat"],
    category: "records",
    summary: "The official statutory revenue register recording land ownership, tenancy, area, and cultivation details.",
    detailedExplanation: `### What is Record of Rights (RoR)?
The **Record of Rights (RoR)** is the primary legal ledger maintained by State Revenue Departments. Depending on the state, it is known as:
- **Jamabandi** (Punjab, Haryana, Himachal Pradesh)
- **Bhulekh / Khatauni** (Uttar Pradesh, Madhya Pradesh, Bihar, Rajasthan)
- **Patta / Chitta** (Tamil Nadu, Andhra Pradesh)
- **7/12 Extract (Saat-Baara)** (Maharashtra, Gujarat)

**Key Terminology:**
- **Khasra Number:** Unique plot/survey number within a revenue village.
- **Khata / Khatauni:** Account number listing all land parcels owned by a specific landholder or family.
- **Khewat Number:** Account number representing the collective ownership share in a joint ancestral holding.`,
    citizenGuidance: "The RoR reflects legal ownership as entered in government revenue books. If your physical boundary differs from the RoR text, a joint demarcated survey should be requested.",
    officerChecklist: [
      "Check registered owner name and relationship details against government ID.",
      "Inspect Khewat/Khatauni shares to ensure no unpartitioned co-owner disputes exist.",
      "Cross-verify declared area against the cadastral GIS surveyed area."
    ]
  },
  {
    id: "area_mismatch",
    title: "Area Mismatch & Spatial Discrepancy Reconciliation",
    keywords: ["area mismatch", "70 sqm", "discrepancy", "difference", "flagged", "mismatch", "variance", "survey variance"],
    category: "gis",
    summary: "Technical difference between the textual area recorded in legacy paper RoR and the high-precision surveyed GIS polygon.",
    detailedExplanation: `### Why do Area Mismatches Occur?
An **area discrepancy** occurs when the land extent recorded in the textual Record of Rights (RoR) does not match the computed area of the georeferenced polygon in the Cadastral GIS database.

**Primary Causes:**
1. **Legacy Survey Methods:** Historical paper records were measured using physical chains (*Gunter's chain / Jareeb*), which carried manual measuring tolerances.
2. **Boundary Shifting:** Physical fences, road widening, or encroachment over decades may alter the ground footprint.
3. **High-Precision GIS Vectorization:** Digital Total Station (ETS), DGPS, and Drone surveys compute area down to centimeter precision using PostGIS ellipsoidal formulas (\`ST_Area\`).

**Example Case (PB-LDH-0042):**
- **RoR Area:** 1,250 sqm (Jamabandi Revenue Record)
- **Cadastral GIS Area:** 1,180 sqm (Bhu-Naksha Vector Survey)
- **Difference:** -70 sqm (-5.6% variance)
- **Governance Requirement:** Requires field verification by the Revenue Officer (*Patwari/Kanungo*) before mutation seal.`,
    citizenGuidance: "A flagged area mismatch does not mean you have lost your land. It is a decision-support flag signaling that revenue officials must conduct a ground verification to synchronize the digital map and paper ledger.",
    officerChecklist: [
      "Review whether the difference falls within state permissible survey tolerance (typically ±2% to ±5%).",
      "Inspect adjacent parcel boundaries for potential overlapping vertices.",
      "Issue field demarcation notice to Patwari/Kanungo if variance exceeds statutory limits."
    ]
  },
  {
    id: "mutation",
    title: "Land Title Mutation (Namantaran / Dakhil Kharij)",
    keywords: ["mutation", "namantaran", "dakhil kharij", "virasat", "succession", "transfer", "adjudicate", "adjudication"],
    category: "workflow",
    summary: "The statutory administrative process of transferring and updating the titleholder name in the Record of Rights after sale, gift, or inheritance.",
    detailedExplanation: `### What is a Land Mutation?
A **Mutation** (*Namantaran* or *Dakhil Kharij*) is the formal recording of a transfer of title in the State Revenue records.

**Types of Mutations:**
1. **Conveyance / Sale Deed:** Transfer of title following a registered sale deed executed at the Sub-Registrar Office.
2. **Virasat / Succession:** Inheritance transfer to legal heirs upon the demise of the titleholder.
3. **Partition / Batwara:** Division of joint agricultural holding among co-sharers.

**Bhu-Setu Mutation Workflow:**
- **Multi-Pillar Verification:** Automatically cross-checks RoR area, GIS polygon overlap, NGDRS deed seals, and municipal tax dues before presenting the case to the Revenue Officer.
- **Cryptographic Audit:** Every officer determination generates an immutable **SHA-256 hash** chained into the audit ledger.`,
    citizenGuidance: "Registration of a sale deed at the Sub-Registrar office proves payment and conveyance, but title ownership in revenue records is finalized only after the mutation is approved by the Revenue Officer.",
    officerChecklist: [
      "Confirm registered sale deed or succession certificate authenticity.",
      "Check for active court injunctions, bank mortgages, or municipal tax arrears.",
      "Enter formal statutory notes and confirm digital signature before sealing the SHA-256 transaction."
    ]
  },
  {
    id: "cadastral_gis",
    title: "Cadastral GIS & PostGIS Spatial Architecture",
    keywords: ["gis", "cadastral", "postgis", "bhu-naksha", "bhu naksha", "polygon", "srid", "4326", "geojson", "spatial", "map"],
    category: "gis",
    summary: "Digital spatial mapping of parcel boundaries using PostgreSQL + PostGIS under the EPSG:4326 geospatial standard.",
    detailedExplanation: `### Cadastral GIS in Bhu-Setu
Bhu-Setu integrates **Bhu-Naksha** vector survey boundaries directly into an enterprise **PostgreSQL + PostGIS** spatial database.

**Key Technical Capabilities:**
- **Standard:** Standardized under **EPSG:4326 / WGS 84** for universal GPS and satellite alignment.
- **Topological Integrity:** PostGIS ensures adjacent parcel boundaries share common vertices without illegal gaps or sliver overlaps.
- **GeoJSON Delivery:** Polygons, boundary rings, and classification layers are served dynamically via high-performance spatial endpoints (\`/api/map/parcels\`).`,
    citizenGuidance: "You can view your exact parcel boundary polygon, neighboring plots, and zoning classification in the Cadastral GIS Map Explorer.",
    officerChecklist: [
      "Use GIS tools to inspect parcel centroid coordinates and perimeter length.",
      "Verify that infrastructure buffer zones (roads, power corridors) do not intersect the parcel."
    ]
  },
  {
    id: "reconciliation",
    title: "Multi-Source Land Data Reconciliation",
    keywords: ["reconciliation", "multi source", "multi-source", "four pillars", "cross-system", "connectors", "pillars"],
    category: "workflow",
    summary: "Automated four-pillar cross-checking connecting State RoR, Bhu-Naksha GIS, NGDRS Deeds, and Municipal Tax.",
    detailedExplanation: `### The Bhu-Setu 4-Pillar Reconciliation Engine
Bhu-Setu connects existing departmental databases without replacing them, performing automated rule-based reconciliation around the ULPID:

1. **State RoR (Jamabandi / Bhulekh):** Owner name, declared extent, Khasra/Khatauni numbers.
2. **Cadastral GIS (Bhu-Naksha):** PostGIS polygon area, spatial vertices, topological boundary.
3. **Registration (NGDRS / IGRS):** Sale deed consideration, registered parties, encumbrance status.
4. **Municipal Urban Planning & Tax:** Designated zoning classification, circle valuation rate, property tax clearance.

**Reconciliation Scoring:** Generates a confidence match score (e.g. 88% or 100%) and itemizes specific field variances for officer decision support.`,
    citizenGuidance: "Reconciliation ensures all government departments have an aligned, synchronized view of your property.",
    officerChecklist: [
      "Review automated confidence match score.",
      "Check itemized variances across area, owner names, and encumbrance flags."
    ]
  },
  {
    id: "risk_scoring",
    title: "AI Land Risk & Due-Diligence Scoring (13-Factor Engine)",
    keywords: ["risk", "risk score", "due diligence", "due-diligence", "encumbrance", "litigation", "zoning risk", "ai risk"],
    category: "risk",
    summary: "Deterministic 13-factor risk assessment evaluating encumbrances, civil disputes, zoning constraints, and survey discrepancies.",
    detailedExplanation: `### Deterministic Land Risk Evaluation
Bhu-Setu's Due-Diligence Engine screens parcels against **13 multi-departmental risk factors** to compute an objective score from **0 to 100**:

- **0 – 29 (LOW RISK):** Clear title, reconciled boundaries, current tax, zero encumbrances.
- **30 – 69 (MODERATE RISK):** Minor technical variances, pending tax notices, or historical mutations under review.
- **70 – 100 (HIGH RISK):** Active civil litigation, banking mortgage liens, severe area discrepancies, or statutory zoning violations.

**Core Evaluated Factors:**
1. Civil Court Litigation / Injunctions
2. Banking Mortgages & Statutory Liens
3. Cadastral Area & Spatial Discrepancies
4. Municipal Master Plan Zoning Violations
5. Outstanding Municipal Property Tax Arrears
6. Ecological / Restriction Buffer Corridor Proximity`,
    citizenGuidance: "A land risk score helps buyers and citizens perform due-diligence before purchasing property or entering into agreements.",
    officerChecklist: [
      "Review the top risk driver breakdown in the Officer Due-Diligence Workbench.",
      "Check whether court stays or mortgage liens have registered clearance certificates."
    ]
  },
  {
    id: "ocr",
    title: "OCR & Land Document Intelligence",
    keywords: ["ocr", "document intelligence", "deed ocr", "confidence", "low confidence", "scanned document"],
    category: "workflow",
    summary: "Extracts key legal entities from scanned sale deeds and Jamabandi pages, flagging low-confidence fields for manual verification.",
    detailedExplanation: `### Document Intelligence in Bhu-Setu
Bhu-Setu processes scanned deeds and paper records using specialized multilingual OCR models:

- **Entity Extraction:** Identifies Seller, Buyer, ULPID, Khasra Number, Consideration Amount, and Stamp Duty.
- **Confidence Scoring:** Assigns a field-level extraction score (e.g., 94% on clean text, 52% on degraded stamps).
- **Safe Protocol for Low-Confidence OCR:** If OCR confidence drops below 75%, Bhu-Setu automatically marks the field for **Mandatory Officer Manual Verification** to prevent clerical errors from contaminating the ledger.`,
    citizenGuidance: "Uploading a high-resolution, unblurred scan of your deed ensures accurate automated entity extraction.",
    officerChecklist: [
      "Review side-by-side document preview against extracted text.",
      "Manually confirm or correct any highlighted low-confidence fields before saving."
    ]
  },
  {
    id: "audit_chain",
    title: "SHA-256 Hash Chain & Tamper-Evident Ledger",
    keywords: ["audit", "hash chain", "sha256", "sha-256", "tamper-evident", "ledger", "cryptographic"],
    category: "audit",
    summary: "Cryptographic SHA-256 hash chaining guaranteeing that every administrative mutation and governance decision is immutable and verifiable.",
    detailedExplanation: `### Tamper-Evident Governance Audit Trail
To ensure transparency and prevent unauthorized alterations of land records, Bhu-Setu implements a **SHA-256 Hash-Chain Audit Ledger**:

- **Cryptographic Chaining:** Each mutation decision packages the ULPID, timestamp, officer ID, decision status, notes, and the **previous transaction's SHA-256 hash**.
- **Immutable Verification:** Any tampering with historical records breaks the mathematical hash chain, immediately alerting system administrators.
- **Citizen Receipt:** Citizens and officers receive a verifiable SHA-256 transaction hash receipt upon every statutory determination.`,
    citizenGuidance: "Your transaction receipt contains a unique SHA-256 audit hash that legally proves when your land record was updated.",
    officerChecklist: [
      "Verify that the previous transaction hash is valid before committing new mutation decisions.",
      "Archive the generated transaction receipt in the official revenue case file."
    ]
  }
];
