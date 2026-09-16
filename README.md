# 🌍 Bhu-Setu

### Integrated GIS-Based Digital Public Infrastructure for Land Governance

> **Smart India Hackathon 2026 — Problem Statement 26014**

Bhu-Setu is an integrated digital platform designed to simplify **land-record discovery, verification, reconciliation, and governance** by bringing together GIS parcel data, Record of Rights (RoR) documents, OCR, AI/ML-based extraction, anomaly detection, conflict identification, and audit trails into a unified workflow.

The platform helps citizens and officials access land information through a transparent, data-driven, and human-in-the-loop system.

---

## 🚀 Key Features

### 🗺️ GIS-Based Parcel Visualization

* Interactive parcel maps using **Leaflet & React Leaflet**
* GeoJSON-based parcel representation
* Unified parcel identification
* Visual comparison of land-record and GIS information

### 📜 AI-Powered Document Processing

* OCR-based extraction from scanned RoR documents
* Image preprocessing and document enhancement
* Structured extraction of land-record fields
* Confidence scoring for extracted information
* Validation and consistency checks

### 🤖 Anomaly Detection

* Rule-based validation
* Machine-learning-based anomaly detection
* Isolation Forest support
* Risk and confidence scoring
* Explainability evidence for detected anomalies

### 🔄 Multi-Source Reconciliation

Bhu-Setu compares information from multiple sources to identify:

* Area mismatches
* Conflicting parcel information
* Inconsistent landholder information
* OCR/data extraction conflicts
* Validation warnings

### 👮 Officer Decision Support

Officials can review identified conflicts and supporting information before recording a mutation decision.

Supported decision states:

```text
approved
rejected
needs_review
```

### 🔐 Tamper-Evident Audit Trail

Mutation actions can be recorded using a **SHA-256 hash-chain mechanism**, creating a tamper-evident history of application-level records.

---

# 🏗️ System Architecture

```text
             ┌───────────────────┐
             │ Citizen / Officer │
             └─────────┬─────────┘
                       │
                       ▼
             ┌───────────────────┐
             │  Next.js Frontend │
             │ React + Leaflet   │
             └─────────┬─────────┘
                       │ REST API
                       ▼
             ┌───────────────────┐
             │   Express API     │
             │    TypeScript     │
             └───────┬─────┬─────┘
                     │     │
              ┌──────┘     └────────┐
              ▼                     ▼
       ┌──────────────┐      ┌──────────────┐
       │ PostgreSQL   │      │ AI/ML Service│
       │ GIS Data     │      │   FastAPI    │
       └──────────────┘      └──────┬───────┘
                                    │
                            ┌───────┴────────┐
                            ▼                ▼
                          OCR        Anomaly Detection
                            │                │
                            └───────┬────────┘
                                    ▼
                            Reconciliation
                                    │
                                    ▼
                              Audit Trail
```

---

# 🧩 Core Modules

## 1. Frontend

The frontend provides citizen and officer-facing interfaces.

**Technologies:**

* Next.js
* React
* TypeScript
* Tailwind CSS
* Leaflet
* React Leaflet
* Lucide React

### Major capabilities

* Parcel search
* Parcel profile
* Interactive map
* Conflict indicators
* OCR upload
* Officer mutation review
* Reconciliation information
* Audit confirmation

---

## 2. Backend

The backend acts as the central API and integration layer.

**Technologies:**

* Node.js
* Express
* TypeScript
* PostgreSQL
* Zod
* JWT
* Multer
* Helmet
* CORS

### Responsibilities

* Parcel retrieval
* Parcel search
* Conflict retrieval
* Mutation decisions
* OCR integration
* GIS parcel retrieval
* Authentication and authorization
* Request validation
* Database persistence
* Audit trail generation

---

## 3. AI/ML Pipeline

Bhu-Setu uses an AI/ML pipeline to process scanned land documents and identify potentially significant inconsistencies.

```text
Scanned RoR Document
        ↓
Image Preprocessing
        ↓
OCR
        ↓
Text & Table Extraction
        ↓
Field Normalization
        ↓
Validation
        ↓
Confidence Scoring
        ↓
Anomaly Detection
        ↓
Conflict Identification
        ↓
Human Review
```

### AI/ML capabilities

* OCR processing
* Image preprocessing
* Structured field extraction
* Table extraction
* Data normalization
* Rule-based validation
* Confidence scoring
* Risk scoring
* Anomaly detection
* Explainability
* Synthetic data generation
* Model evaluation

---

# 📜 Land Record Information

The extraction pipeline works with land-record concepts such as:

### Document Information

* Document ID
* State
* District
* Tehsil
* Village
* Year
* Document type
* Khata number
* Khewat number
* Khatoni number
* Mutation number
* Mutation date

### Landholder Information

* Name
* Father / Husband name
* Address
* Share
* Cultivator status

### Parcel Information

* Khasra number
* Area
* Area unit
* Land classification
* Land type
* Cultivation status
* Irrigation source
* Revenue
* Remarks

---

# 🔍 Confidence & Explainability

Bhu-Setu maintains confidence information throughout the document-processing pipeline.

```text
OCR Confidence
      ↓
Extraction Confidence
      ↓
Validation Results
      ↓
Overall Confidence
      ↓
Risk / Anomaly Indicators
```

The system can also provide supporting evidence for anomaly and scoring results, helping officials understand why a record has been flagged.

---

# 🗺️ GIS & Parcel Intelligence

GIS information is integrated directly into the parcel workflow.

The frontend uses **Leaflet / React Leaflet**, while parcel geometry can be represented using GeoJSON.

Example:

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "ulpid": "PB-LDH-0042",
        "land_use": "Residential"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": []
      }
    }
  ]
}
```

---

# 🔄 Multi-Source Reconciliation

Bhu-Setu compares information from different sources instead of treating a single source as automatically authoritative.

```text
             ┌──────────────┐
             │     RoR      │
             └──────┬───────┘
                    │
                    ▼
             ┌──────────────┐
             │Reconciliation│
             │    Engine     │
             └──────┬───────┘
                    ▲
          ┌─────────┴─────────┐
          │                   │
    ┌─────┴─────┐       ┌─────┴─────┐
    │    GIS    │       │Registration│
    └───────────┘       └────────────┘
```

Potential discrepancies include:

* Area mismatch
* Conflicting parcel information
* Different source values
* OCR conflicts
* Validation warnings
* Anomalous records

---

# 👮 Officer Workflow

```text
Parcel Selected
      ↓
Review Reconciliation
      ↓
Inspect Conflicts
      ↓
Review Supporting Information
      ↓
Enter Verification Notes
      ↓
Decision
      ↓
Audit Record
```

The system is designed around **human-in-the-loop decision support**, where AI assists review rather than independently determining legal outcomes.

---

# 🔐 Tamper-Evident Audit Trail

Bhu-Setu uses a SHA-256 based hash-chain concept for application-level mutation records.

```text
Record 1
   ↓
SHA-256 Hash 1
   ↓
Record 2 + Hash 1
   ↓
SHA-256 Hash 2
   ↓
Record 3 + Hash 2
   ↓
...
```

This creates a tamper-evident sequence of records within the application.

> This is an application-level audit mechanism and is not intended to represent a public blockchain.

---

# 🔌 API Overview

| Method | Endpoint                             | Purpose                      |
| ------ | ------------------------------------ | ---------------------------- |
| `GET`  | `/api/parcel/{ulpid}`                | Retrieve parcel information  |
| `GET`  | `/api/parcel/search?q=`              | Search parcels               |
| `GET`  | `/api/parcel/{ulpid}/conflicts`      | Retrieve conflicts           |
| `GET`  | `/api/parcel/{ulpid}/reconciliation` | Retrieve reconciliation data |
| `POST` | `/api/mutation/{ulpid}`              | Submit mutation decision     |
| `POST` | `/api/ocr/extract`                   | Process uploaded document    |
| `GET`  | `/api/map/parcels`                   | Retrieve parcel GeoJSON      |
| `POST` | `/api/v1/inference/document`         | Run AI/ML inference          |

---

# 🛠️ Technology Stack

| Layer             | Technologies                            |
| ----------------- | --------------------------------------- |
| Frontend          | Next.js, React, TypeScript              |
| UI                | Tailwind CSS, Lucide React              |
| Maps              | Leaflet, React Leaflet                  |
| Backend           | Node.js, Express, TypeScript            |
| Database          | PostgreSQL                              |
| GIS               | GeoJSON / PostGIS-oriented architecture |
| AI/ML             | Python, NumPy                           |
| OCR               | PaddleOCR                               |
| Computer Vision   | OpenCV, Pillow                          |
| Anomaly Detection | Isolation Forest                        |
| Authentication    | JWT                                     |
| Validation        | Zod                                     |
| Testing           | Jest, Pytest                            |
| Audit             | SHA-256                                 |

---

# 📁 Project Structure

```text
SIH-2026-dev/
│
├── ai_ml/
│   ├── anomaly/
│   ├── extraction/
│   ├── inference/
│   ├── ocr/
│   ├── pipeline/
│   ├── preprocessing/
│   ├── scoring/
│   ├── synthetic/
│   ├── validation/
│   └── tests/
│
├── backend/
│   ├── app/
│   ├── src/
│   └── tests/
│
├── frontend/
│   ├── app/
│   ├── components/
│   └── lib/
│
├── gis/
├── docs/
├── scripts/
└── tests/
    └── e2e/
```

---

# ⚡ Getting Started

## Prerequisites

* Node.js 20+
* npm
* Python 3.x
* PostgreSQL
* Git

### Clone the repository

```bash
git clone https://github.com/<YOUR-USERNAME>/SIH-2026-dev.git
cd SIH-2026-dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend:

```text
http://localhost:3000
```

### Backend

```bash
cd backend
npm install
npm run dev
```

Configure environment variables using the provided `.env.example`.

### AI/ML

```bash
cd ai_ml
python -m venv .venv
```

**Windows:**

```bash
.venv\Scripts\activate
```

**Linux/macOS:**

```bash
source .venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

---

# 🧪 Testing

### Backend

```bash
cd backend
npm test
```

### AI/ML

```bash
pytest ai_ml/tests/
```

End-to-end testing infrastructure is available under:

```text
tests/e2e/
```

---

# 🗺️ Roadmap

### Implemented

* [x] Unified parcel workflow
* [x] GIS parcel visualization
* [x] OCR pipeline
* [x] Structured field extraction
* [x] Validation
* [x] Confidence scoring
* [x] Anomaly detection components
* [x] Conflict/reconciliation workflow
* [x] Officer mutation workflow
* [x] Role-based authorization
* [x] SHA-256 audit mechanism
* [x] Testing infrastructure

### Future Enhancements

* [ ] Production government-system integrations
* [ ] Larger multilingual RoR datasets
* [ ] Improved historical-document OCR
* [ ] Advanced geospatial analytics
* [ ] Model monitoring and drift detection
* [ ] Production cloud deployment
* [ ] Mobile-first citizen experience

---

# 👥 Team

**Bhu-Setu — Smart India Hackathon 2026**

> **SIH 2026 — Problem Statement 26014**

| Team Member       | Responsibility                   |
| ----------------- | -------------------------------- |
| 👑 **Vansh**      | **Team Leader**                  |
| 🔬 **Sushil**     | **Domain Research**              |
| 🤖 **Varun**      | **AI / ML**                      |
| ⚙️ **Somnath**    | **Backend Development**          |
| 🎨 **Kaajal**     | **Frontend Development**         |
| 🗺️ **Samyuktha** | **GIS & Geospatial Integration** |

### 🧩 Team Expertise

```text
Vansh       → Team Leadership & Project Coordination
Sushil      → Domain Research & Problem Analysis
Varun       → AI/ML, OCR & Anomaly Detection
Somnath     → Backend, APIs & Database
Kaajal      → Frontend & User Experience
Samyuktha   → GIS, Mapping & Geospatial Data
```

---

# 📚 Documentation

Detailed technical documentation is available in:

```text
docs/
```

Including:

* System architecture
* API contracts
* AI/ML architecture
* Integration documentation
* Backend documentation
* Implementation stages
* Evaluation and readiness reports

---

# 🔒 Security & Privacy

For production deployment, additional security measures should include:

* Secure secret management
* Strong authentication and authorization
* Encryption in transit and at rest
* Secure document storage
* Database hardening
* Rate limiting
* Audit-log protection
* Privacy and data-retention controls

**Never commit real land records, credentials, API keys, or sensitive personal information to a public repository.**

---

# ⚠️ Disclaimer

Bhu-Setu is a **Smart India Hackathon 2026 prototype**.

AI-generated extraction, confidence scores, anomaly indicators, and reconciliation results are intended for **decision support and human review**. They should not be treated as independent legal determinations of land ownership, title, boundaries, or rights.

Demonstration data should not be interpreted as live government land records.

---

# ⭐ Bhu-Setu

### Connecting Land Records • GIS • AI • Reconciliation • Governance

**Built for Smart India Hackathon 2026 🇮🇳**
