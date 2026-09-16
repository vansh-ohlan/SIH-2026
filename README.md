# 🌍 Bhu-Setu

### Integrated GIS-Based Digital Public Infrastructure for Land Governance

> **Smart India Hackathon 2026 — Problem Statement 26014**

Bhu-Setu is an integrated digital platform designed to simplify **land-record discovery, verification, reconciliation, and governance** by bringing together GIS parcel data, Record of Rights (RoR) documents, OCR, AI/ML-based extraction, anomaly detection, conflict identification, and audit trails into a unified workflow.

The platform is designed to help citizens and officials access land information through a transparent, data-driven, and human-in-the-loop system.

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

Bhu-Setu compares information from multiple sources, helping identify:

* Area mismatches
* Conflicting parcel information
* Inconsistent landholder information
* OCR/data extraction conflicts
* Validation warnings

### 👮 Officer Decision Support

Officials can review identified conflicts and supporting information before recording a mutation decision.

Supported decision states include:

```text
approved
rejected
needs_review
```

### 🔐 Tamper-Evident Audit Trail

Mutation actions can be recorded using a **SHA-256 hash-chain mechanism**, creating a tamper-evident history of application-level records.

---

# 🏗️ Architecture

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

# 🛠️ Technology Stack

| Layer             | Technologies                            |
| ----------------- | --------------------------------------- |
| Frontend          | Next.js, React, TypeScript              |
| Styling           | Tailwind CSS                            |
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
| Audit             | SHA-256 Hash Chain                      |

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

# 🤖 AI/ML Workflow

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

The system is designed to preserve uncertainty through confidence and risk indicators rather than treating every extracted value as equally reliable.

---

# 🔌 API Overview

The backend provides REST APIs for the major application workflows.

| Method | Endpoint                             | Purpose                      |
| ------ | ------------------------------------ | ---------------------------- |
| GET    | `/api/parcel/{ulpid}`                | Retrieve parcel information  |
| GET    | `/api/parcel/search?q=`              | Search parcels               |
| GET    | `/api/parcel/{ulpid}/conflicts`      | Retrieve conflicts           |
| GET    | `/api/parcel/{ulpid}/reconciliation` | Retrieve reconciliation data |
| POST   | `/api/mutation/{ulpid}`              | Submit mutation decision     |
| POST   | `/api/ocr/extract`                   | Process uploaded document    |
| GET    | `/api/map/parcels`                   | Retrieve parcel GeoJSON      |
| POST   | `/api/v1/inference/document`         | Run AI/ML inference          |

---

# ⚡ Getting Started

## Prerequisites

Install:

* Node.js 20+
* npm
* Python 3.x
* PostgreSQL
* Git

### Clone

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

The frontend runs on:

```text
http://localhost:3000
```

### Backend

```bash
cd backend
npm install
npm run dev
```

Configure environment variables using the project's `.env.example` file.

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

The repository contains testing infrastructure for the backend, AI/ML modules, and end-to-end workflows.

### Backend

```bash
cd backend
npm test
```

### AI/ML

```bash
pytest ai_ml/tests/
```

End-to-end tests are located under:

```text
tests/e2e/
```

---

# 🔎 Example Use Case

Consider a parcel where:

```text
RoR Area          → 1,250 sqm
GIS Survey Area   → 1,180 sqm
Difference        → 70 sqm
```

Bhu-Setu can identify the discrepancy, calculate relevant indicators, surface the conflict to the officer, and provide supporting information for review.

The system is intended to **assist human decision-making rather than automatically determine legal ownership or title**.

---

# 🔐 Security & Privacy

For production deployment, the platform should incorporate:

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

# 🗺️ Roadmap

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
* [x] Automated testing infrastructure

### Future

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

Developed collaboratively for:

> **SIH 2026 — Problem Statement 26014**

### Contributors

Add your team members here:

```text
👤 Name — Role — GitHub
👤 Name — Role — GitHub
👤 Name — Role — GitHub
👤 Name — Role — GitHub
```

---

# 📚 Documentation

Detailed technical documentation is available in:

```text
docs/
```

Including:

* Architecture
* API contracts
* AI/ML architecture
* Integration documentation
* Backend documentation
* Implementation stages
* Evaluation and readiness reports

---

# ⚠️ Disclaimer

Bhu-Setu is a **Smart India Hackathon 2026 prototype**.

AI-generated extraction, confidence scores, anomaly indicators, and reconciliation results are intended for **decision support and human review**. They should not be treated as independent legal determinations of land ownership, title, boundaries, or rights.

Demonstration data should not be interpreted as live government land records.

---

## ⭐ Bhu-Setu

**Connecting Land Records • GIS • AI • Reconciliation • Governance**

### Built for Smart India Hackathon 2026 🇮🇳
