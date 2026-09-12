# Bhu-Setu — Frontend

Citizen portal + officer dashboard for **SIH 26014**, built against
`api_contracts.md`. Next.js 14 (App Router) + TypeScript + Tailwind + Leaflet.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000.

By default the app calls `http://localhost:5000/api` (Backend's stub
server). If that's unreachable it **silently falls back to mock data** in
`lib/mockData.ts`, so the app is fully demoable before Backend is up, and
nothing changes on your end once it is — see `lib/api.ts`.

To point at a different backend host/port, copy `.env.local.example` to
`.env.local` and edit `NEXT_PUBLIC_API_BASE`.

## Structure

```
app/
  page.tsx                 Citizen portal — hero, search, cadastral map
  parcel/[ulpid]/page.tsx  Full parcel record (owner, tax, mutations, conflicts)
  officer/page.tsx         Officer dashboard shell
  layout.tsx, globals.css  Fonts + design tokens

components/
  Navbar.tsx           Shared nav
  SearchBar.tsx         Debounced search against /parcel/search
  MapView.tsx           Leaflet + GeoJSON, colored by land_use, click-to-open
  ConflictBadge.tsx     low/medium/high badge (exact set from the contract)
  MutationQueue.tsx     Officer's conflict queue + approve/reject/needs_review drawer

lib/
  api.ts        One function per contract endpoint. Tries the real API,
                falls back to mock data on failure/timeout.
  mockData.ts   Hardcoded data matching every example in api_contracts.md,
                expanded to 4 parcels so the map/search/queue aren't empty.
  types.ts      TypeScript types mirroring the contract shapes exactly.
```

## Endpoints wired up (see `lib/api.ts`)

| Function | Contract route |
|---|---|
| `getParcel(ulpid)` | `GET /parcel/{ulpid}` |
| `searchParcels(q)` | `GET /parcel/search?q=` |
| `getConflicts(ulpid)` | `GET /parcel/{ulpid}/conflicts` |
| `postMutationDecision(ulpid, body)` | `POST /mutation/{ulpid}` |
| `extractOcr(file)` | `POST /ocr/extract` |
| `getMapParcels()` | `GET /map/parcels` |

## Design notes

Cartographic theme — dashed "plot boundary" borders instead of card
shadows, a coordinate-tick ruler motif, and a survey-stamp mark — built to
read as an official land-record system rather than a generic dashboard
template. Colors and type are defined as Tailwind tokens in
`tailwind.config.ts` (`ink`, `parchment`, `ochre`, `land`, `brick`).

## Known gaps / next steps

- `extractOcr` in `lib/api.ts` is wired but not yet called from any page —
  hook it up to an "Digitize record" upload button on the officer
  dashboard if ML's pipeline is ready before judging.
- No auth beyond the dummy bearer token the contract specifies for Phase 1–3.
- Map tiles are OpenStreetMap (free, keyless). Swap to Mapbox GL only if you
  want custom styling and have a token — not required.
