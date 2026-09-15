import {
  Parcel,
  SearchResult,
  Conflict,
  MutationDecisionRequest,
  MutationDecisionResponse,
  OcrResult,
  GeoFeatureCollection,
  PilotRegion,
  RegionId,
  EncroachmentAlert,
  UtilityLine,
} from "./types";
import {
  MOCK_PARCELS,
  MOCK_CONFLICTS,
  MOCK_SEARCH_INDEX,
  MOCK_GEOJSON,
  MOCK_REGIONAL_GEOJSON,
  PILOT_REGIONS,
  MOCK_ENCROACHMENT_ALERTS,
  MOCK_UTILITIES,
} from "./mockData";

// Point this at Backend once their stub routes are live — nothing else in
// the app needs to change, since every function below returns the exact
// shape defined in api_contracts.md whether it hits the real API or mocks.
const BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:5000/api";

const DUMMY_TOKEN = "demo-token";

async function tryFetch<T>(path: string, init?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${DUMMY_TOKEN}`,
        ...(init?.headers ?? {}),
      },
      // Keep demo snappy — don't hang the UI waiting on a backend that
      // isn't up yet.
      signal: AbortSignal.timeout(2500),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function getParcel(ulpid: string): Promise<Parcel | null> {
  const live = await tryFetch<Parcel>(`/parcel/${ulpid}`);
  if (live) return live;
  await sleep(150);
  return MOCK_PARCELS[ulpid] ?? null;
}

export async function searchParcels(q: string): Promise<SearchResult[]> {
  const live = await tryFetch<SearchResult[]>(
    `/parcel/search?q=${encodeURIComponent(q)}`
  );
  if (live) return live;
  await sleep(150);
  const query = q.trim().toLowerCase();
  if (!query) return [];
  return MOCK_SEARCH_INDEX.filter(
    (r) =>
      r.name.toLowerCase().includes(query) ||
      r.ulpid.toLowerCase().includes(query)
  );
}

export async function getConflicts(ulpid: string): Promise<Conflict[]> {
  const live = await tryFetch<Conflict[]>(`/parcel/${ulpid}/conflicts`);
  if (live) return live;
  await sleep(120);
  return MOCK_CONFLICTS[ulpid] ?? [];
}

export async function postMutationDecision(
  ulpid: string,
  body: MutationDecisionRequest
): Promise<MutationDecisionResponse> {
  const live = await tryFetch<MutationDecisionResponse>(`/mutation/${ulpid}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (live) return live;
  await sleep(300);
  // Mimic the chained SHA-256 audit hash described in the contract closely
  // enough for a convincing demo.
  const fake = Array.from({ length: 16 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join("");
  return {
    status: "recorded",
    audit_hash: `${fake}...`,
    timestamp: new Date().toISOString(),
  };
}

export async function extractOcr(
  file: File | { name: string; preset?: "punjab_jamabandi" | "tamil_nadu_patta" }
): Promise<OcrResult | null> {
  const isTamilNadu =
    (typeof file.name === "string" &&
      file.name.toLowerCase().includes("tamil")) ||
    (typeof file.name === "string" &&
      file.name.toLowerCase().includes("patta")) ||
    ("preset" in file && file.preset === "tamil_nadu_patta");

  // Attempt real live backend if available
  if (file instanceof File) {
    const form = new FormData();
    form.append("file", file);
    const live = await tryFetch<OcrResult>(`/ocr/extract`, {
      method: "POST",
      body: form,
    });
    if (live) return live;
  }

  // Realistic mock inference latency
  await sleep(650);

  if (isTamilNadu) {
    return {
      owner: "K. Venkatesan",
      area: 3200,
      survey_no: "284/1B",
      confidence: 0.94,
      ulpid: "TN-SPR-0814",
      state: "Tamil Nadu",
      record_type: "Patta / Chitta (Tamil Nadu)",
      patta_no: "PAT-84102",
      sub_division: "Block 4, Sriperumbudur Taluk",
      cadastral_survey_area: 3200,
      area_discrepancy_sqm: 0,
      bounding_boxes: [
        {
          field: "patta_no",
          label: "Patta Number",
          value: "PAT-84102",
          confidence: 0.96,
          top: "18%",
          left: "64%",
          width: "28%",
          height: "6%",
        },
        {
          field: "owner",
          label: "Registered Pattadhar",
          value: "K. Venkatesan",
          confidence: 0.95,
          top: "32%",
          left: "14%",
          width: "48%",
          height: "7%",
        },
        {
          field: "survey_no",
          label: "Survey & Sub-division",
          value: "284/1B",
          confidence: 0.93,
          top: "47%",
          left: "14%",
          width: "36%",
          height: "7%",
        },
        {
          field: "area",
          label: "Extent (Hectares/Sqm)",
          value: "3,200 sqm (0.320 Ha)",
          confidence: 0.92,
          top: "62%",
          left: "14%",
          width: "42%",
          height: "7%",
        },
      ],
    };
  }

  // Default: Punjab Jamabandi Record of Rights
  return {
    owner: "Ramesh Kumar",
    area: 1250,
    survey_no: "142/3",
    confidence: 0.89,
    ulpid: "PB-LDH-0042",
    state: "Punjab",
    record_type: "Jamabandi (Punjab)",
    khewat_no: "74/82",
    khatauni_no: "112",
    cadastral_survey_area: 1180,
    area_discrepancy_sqm: 70, // 1250 in RoR vs 1180 in GIS survey
    bounding_boxes: [
      {
        field: "khewat_no",
        label: "Khewat / Khatauni",
        value: "74/82 · 112",
        confidence: 0.93,
        top: "22%",
        left: "14%",
        width: "32%",
        height: "6%",
      },
      {
        field: "owner",
        label: "Malik / Cultivator Name",
        value: "Ramesh Kumar s/o Som Nath",
        confidence: 0.91,
        top: "36%",
        left: "14%",
        width: "56%",
        height: "7%",
      },
      {
        field: "survey_no",
        label: "Khasra Number",
        value: "142/3",
        confidence: 0.88,
        top: "52%",
        left: "14%",
        width: "28%",
        height: "6%",
      },
      {
        field: "area",
        label: "Rakba (Extracted Area)",
        value: "1,250 sqm (2 Kanals 9 Marlas)",
        confidence: 0.89,
        top: "67%",
        left: "14%",
        width: "46%",
        height: "7%",
      },
    ],
  };
}

export async function submitOcrVerification(payload: {
  ulpid: string;
  decision: "confirmed" | "flagged_mismatch";
  officer_id?: string;
  notes?: string;
  extracted_data: Partial<OcrResult>;
}): Promise<{
  status: string;
  audit_hash: string;
  timestamp: string;
  action_summary: string;
}> {
  await sleep(400);
  const fakeHash = Array.from({ length: 32 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join("");

  return {
    status: payload.decision === "confirmed" ? "synced_to_cadastre" : "conflict_flagged",
    audit_hash: fakeHash,
    timestamp: new Date().toISOString(),
    action_summary:
      payload.decision === "confirmed"
        ? `RoR metadata for ${payload.ulpid} verified and integrated into cadastral register.`
        : `Discrepancy flagged for ${payload.ulpid}: Dispatched to Officer Mutation Queue for ground survey inspection.`,
  };
}

export async function getMapParcels(): Promise<GeoFeatureCollection> {
  const live = await tryFetch<GeoFeatureCollection>(`/map/parcels`);
  if (live) return live;
  await sleep(150);
  return MOCK_GEOJSON;
}

// ==========================================
// Land Stack Geospatial Endpoints & Fallbacks
// ==========================================

export async function getPilotRegions(): Promise<PilotRegion[]> {
  return PILOT_REGIONS;
}

export async function getMapParcelsByRegion(
  regionId: RegionId
): Promise<GeoFeatureCollection> {
  const live = await tryFetch<GeoFeatureCollection>(
    `/map/parcels?region=${regionId}`
  );
  if (live) return live;
  await sleep(120);
  return MOCK_REGIONAL_GEOJSON[regionId] ?? MOCK_GEOJSON;
}

export async function getEncroachmentAlerts(
  regionId?: RegionId
): Promise<EncroachmentAlert[]> {
  const path = regionId
    ? `/ai/encroachment-alerts?region=${regionId}`
    : `/ai/encroachment-alerts`;
  const live = await tryFetch<EncroachmentAlert[]>(path);
  if (live) return live;
  await sleep(100);
  if (!regionId) return MOCK_ENCROACHMENT_ALERTS;
  return MOCK_ENCROACHMENT_ALERTS.filter((a) => a.region_id === regionId);
}

export async function getUtilityLines(
  regionId?: RegionId
): Promise<UtilityLine[]> {
  const path = regionId
    ? `/map/utilities?region=${regionId}`
    : `/map/utilities`;
  const live = await tryFetch<UtilityLine[]>(path);
  if (live) return live;
  await sleep(100);
  if (!regionId) return MOCK_UTILITIES;
  return MOCK_UTILITIES.filter((u) => u.region_id === regionId);
}
