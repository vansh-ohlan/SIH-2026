# Bhu-Setu — Frontend Prototype (SIH 2026)

The frontend application for **Bhu-Setu** (Smart India Hackathon 2026 — Problem Statement 26014): **An Integrated GIS-based Digital Public Infrastructure for Land Governance**.

Built with **Next.js 14 (App Router)**, **TypeScript**, **Tailwind CSS**, and **Leaflet (React-Leaflet)**.

---

## 🚀 Quick Start

1. **Install dependencies:**
   ```bash
   cd frontend
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env.local
   ```
   *(Default points to `http://localhost:5000/api`)*

3. **Start development server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000).

4. **Production Build & Lint:**
   ```bash
   npm run lint
   npm run build
   ```

---

## 🧭 Application Routes

| Route | Page Purpose | Description |
| :--- | :--- | :--- |
| `/` | **Landing Page** | GovTech hero, non-disruptive integration process flow, CTA buttons, and featured parcel previews. |
| `/citizen` | **Citizen Portal** | Public parcel lookup by ULPID/name, quick filter chips, and embedded cadastral survey map preview. |
| `/citizen/search` | **Search Results** | Live parcel search result grid with direct link to cadastral records. |
| `/citizen/parcel/:ulpid` | **Parcel Details** | Spatial specs, titleholders, tax status, mutation history, RoR vs GIS area comparison, and PostGIS preview. |
| `/map` | **GIS Map Explorer** | Full-screen interactive Leaflet map rendering GeoJSON parcel polygons (`/api/map/parcels`) with region selectors and layer controls. |
| `/officer` | **Officer Dashboard** | Governance hub with metrics, priority inconsistency queue featuring `PB-LDH-0042`, and mutation activity stream. |
| `/officer/conflicts` | **Conflict Matrix** | Filterable list of technical inconsistencies between RoR land records and cadastral ground surveys. |
| `/officer/mutations` | **Mutation Workflow** | Statutory adjudication interface (Approve, Reject, Needs Review) with SHA-256 cryptographic audit receipt. |
| `/login` | **Demo Role Switcher** | Prototype authentication interface for switching between Citizen, Revenue Officer, Sub-Registrar, and Admin roles. |

---

## 🔐 Authentication & RBAC

The prototype uses JWT Bearer authentication connected to the backend development endpoint:
- **Authentication**: `Authorization: Bearer <token>`
- **Token Generation**: Calls `POST /api/auth/dev-token` with `{ "role": "<role>" }`.
- **Role Permissions**:
  - `citizen`: Read-only access to parcel records, search, and GIS maps. Cannot submit mutation decisions (403 Forbidden).
  - `revenue_officer`: Full access to review conflict queues and execute mutation determinations with SHA-256 audit signing.
  - `registrar`: Sub-Registrar deed verification and mutation approvals.
  - `admin`: Full system configuration and administrative override.

---

## 🗺️ GIS & Backend Integration

- **Backend Base URL**: `http://localhost:5000/api`
- **Parcel API**: `GET /api/parcel/{ulpid}`
- **Search API**: `GET /api/parcel/search?q={query}`
- **Conflicts API**: `GET /api/parcel/{ulpid}/conflicts`
- **Mutation API**: `POST /api/mutation/{ulpid}` *(Protected by RBAC)*
- **Map GeoJSON API**: `GET /api/map/parcels`
- **Auth Dev Token API**: `POST /api/auth/dev-token`
- **Auth Profile API**: `GET /api/auth/me`

> **Offline Demonstration Fallback**: If the backend service is offline, the frontend seamlessly falls back to high-fidelity synthetic mock data (`lib/mockData.ts`) while clearly displaying the *"Demo Dataset"* indicator.

---

## 🎯 12-Step Demo User Journey

1. **Open Landing Page** (`/`): View the Bhu-Setu DPI architecture and process flow.
2. **Open Citizen Portal** (`/citizen`): Access public land record lookup.
3. **Search Parcel**: Search `PB-LDH-0042` or `Ramesh`.
4. **Inspect Parcel Record** (`/citizen/parcel/PB-LDH-0042`): Review Ramesh Kumar's 1,250 sqm residential holding.
5. **Inspect GIS Boundary**: View the PostGIS polygon geometry (EPSG:4326).
6. **Inspect Conflicts Tab**: View the flagged **Area Mismatch** (RoR 1,250 sqm vs Cadastral Survey 1,180 sqm, 70 sqm difference).
7. **Switch to Revenue Officer** (`/login`): Select Revenue Officer (`OFF-102`) to obtain an officer JWT.
8. **Open Officer Hub** (`/officer`): Review the prioritized conflict queue.
9. **Open Conflict Review** (`/officer/conflicts`): Inspect the comparative area analysis.
10. **Open Mutation Adjudication** (`/officer/mutations?ulpid=PB-LDH-0042`): Review the prefilled case.
11. **Submit Decision**: Select **Needs Review**, enter officer notes, and confirm.
12. **Verify Cryptographic Receipt**: View the returned **SHA-256 Audit Hash** and timestamp sealed in the PostgreSQL ledger.
