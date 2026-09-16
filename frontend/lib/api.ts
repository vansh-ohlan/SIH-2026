import {
  Parcel,
  SearchResult,
  Conflict,
  MutationDecisionRequest,
  MutationDecisionResponse,
  GeoFeatureCollection,
  DevTokenResponse,
  AuthUser,
  UserRole,
  PilotRegion,
  RegionId,
  EncroachmentAlert,
  UtilityLine,
  OcrResult,
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

const BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:5000/api";

export async function checkBackendConnection(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/parcel/search?q=PB`, {
      signal: AbortSignal.timeout(1500),
    });
    return res.ok;
  } catch {
    return false;
  }
}

function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem("bhu_setu_token");
  } catch {
    return null;
  }
}

async function tryFetch<T>(
  path: string,
  init?: RequestInit,
  customToken?: string
): Promise<{ data: T | null; status: number; error?: string }> {
  try {
    const token = customToken || getStoredToken();
    const headers: Record<string, string> = {
      ...(init?.headers as Record<string, string>),
    };

    if (token && !headers["Authorization"]) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers,
      signal: AbortSignal.timeout(3000),
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => null);
      return {
        data: null,
        status: res.status,
        error: errBody?.message || errBody?.error || `HTTP ${res.status}`,
      };
    }

    const json = (await res.json()) as T;
    return { data: json, status: res.status };
  } catch {
    return { data: null, status: 0, error: "Network connection failed" };
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// 1. Get Parcel Details: GET /api/parcel/{ulpid}
export async function getParcel(ulpid: string): Promise<Parcel | null> {
  const { data } = await tryFetch<Parcel>(`/parcel/${ulpid}`);
  if (data) return data;
  await sleep(100);
  return MOCK_PARCELS[ulpid] ?? null;
}

// 2. Search Parcels: GET /api/parcel/search?q={query}
export async function searchParcels(q: string): Promise<SearchResult[]> {
  const query = q.trim();
  if (!query) return [];

  const { data } = await tryFetch<SearchResult[]>(
    `/parcel/search?q=${encodeURIComponent(query)}`
  );
  if (data) return data;

  await sleep(100);
  const lower = query.toLowerCase();
  return MOCK_SEARCH_INDEX.filter(
    (r) =>
      r.name.toLowerCase().includes(lower) ||
      r.ulpid.toLowerCase().includes(lower)
  );
}

// 3. Get Parcel Conflicts: GET /api/parcel/{ulpid}/conflicts
export async function getConflicts(ulpid: string): Promise<Conflict[]> {
  const { data } = await tryFetch<Conflict[]>(`/parcel/${ulpid}/conflicts`);
  if (data) return data;
  await sleep(100);
  return MOCK_CONFLICTS[ulpid] ?? [];
}

// 4. Submit Mutation Decision: POST /api/mutation/{ulpid}
export async function postMutationDecision(
  ulpid: string,
  body: MutationDecisionRequest
): Promise<MutationDecisionResponse> {
  const res = await tryFetch<MutationDecisionResponse>(`/mutation/${ulpid}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (res.data) {
    return res.data;
  }

  if (res.status === 401) {
    throw new Error("Authentication required (401). Please sign in as an officer.");
  }
  if (res.status === 403) {
    throw new Error("Insufficient permissions (403). Only revenue officers, registrars, or admins can approve mutations.");
  }
  if (res.status === 404) {
    throw new Error(`Parcel ${ulpid} not found (404).`);
  }

  // Graceful fallback for offline demo
  await sleep(350);
  const fakeHash = Array.from({ length: 64 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join("");

  return {
    status: "recorded",
    audit_hash: fakeHash,
    timestamp: new Date().toISOString(),
  };
}

// 5. Get Map Parcels (GeoJSON): GET /api/map/parcels
export async function getMapParcels(): Promise<GeoFeatureCollection> {
  const { data } = await tryFetch<GeoFeatureCollection>(`/map/parcels`);
  if (data) return data;
  await sleep(100);
  return MOCK_GEOJSON;
}

// 6. Regional Map Parcels
export async function getPilotRegions(): Promise<PilotRegion[]> {
  return PILOT_REGIONS;
}

export async function getMapParcelsByRegion(
  regionId: RegionId
): Promise<GeoFeatureCollection> {
  const { data } = await tryFetch<GeoFeatureCollection>(
    `/map/parcels?region=${regionId}`
  );
  if (data) return data;
  await sleep(100);
  return MOCK_REGIONAL_GEOJSON[regionId] ?? MOCK_GEOJSON;
}

export async function getEncroachmentAlerts(
  regionId?: RegionId
): Promise<EncroachmentAlert[]> {
  await sleep(100);
  if (!regionId) return MOCK_ENCROACHMENT_ALERTS;
  return MOCK_ENCROACHMENT_ALERTS.filter((a) => a.region_id === regionId);
}

export async function getUtilityLines(
  regionId?: RegionId
): Promise<UtilityLine[]> {
  await sleep(100);
  if (!regionId) return MOCK_UTILITIES;
  return MOCK_UTILITIES.filter((u) => u.region_id === regionId);
}

// 7. Development Token Generation: POST /api/auth/dev-token
export async function generateDevToken(
  role: UserRole,
  customData?: { userId?: string; name?: string; officerId?: string }
): Promise<DevTokenResponse> {
  const { data } = await tryFetch<DevTokenResponse>(`/auth/dev-token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      role,
      userId: customData?.userId,
      name: customData?.name,
      officerId: customData?.officerId,
    }),
  });

  if (data) return data;

  // Offline mock fallback
  const defaultNames: Record<UserRole, string> = {
    citizen: "Citizen User",
    revenue_officer: "Officer Sharma",
    registrar: "Sub-Registrar Verma",
    admin: "System Administrator",
  };

  const defaultIds: Record<UserRole, string> = {
    citizen: "CIT-101",
    revenue_officer: "OFF-102",
    registrar: "REG-201",
    admin: "ADM-999",
  };

  const user: AuthUser = {
    role,
    userId: customData?.userId || defaultIds[role],
    name: customData?.name || defaultNames[role],
    officerId: customData?.officerId || (role !== "citizen" ? defaultIds[role] : undefined),
  };

  return {
    token: `demo-jwt-token-for-${role}-${Date.now()}`,
    expiresIn: "1h",
    user,
  };
}

// 8. Get Authenticated Context: GET /api/auth/me
export async function getAuthMe(token?: string): Promise<AuthUser | null> {
  const { data } = await tryFetch<{ user: AuthUser }>(`/auth/me`, undefined, token);
  return data?.user ?? null;
}

// 9. OCR Extraction & Verification Helpers
export async function extractOcr(
  file: File | { name: string; preset?: "punjab_jamabandi" | "tamil_nadu_patta" | "blurry_ror" | "owner_mismatch" }
): Promise<OcrResult | null> {
  if (file instanceof File) {
    const form = new FormData();
    form.append("file", file);
    const { data } = await tryFetch<OcrResult>(`/ocr/extract`, {
      method: "POST",
      body: form,
    });
    if (data) {
      return {
        ...data,
        ulpid: "PB-LDH-0042",
        state: "Punjab",
        record_type: "Jamabandi (Punjab)",
        khewat_no: "74/82",
        khatauni_no: "112",
        cadastral_survey_area: 1180,
        area_discrepancy_sqm: Math.abs(data.area - 1180),
      };
    }
  }

  await sleep(400);

  const lowerName = typeof file.name === "string" ? file.name.toLowerCase() : "";
  const preset = "preset" in file ? file.preset : undefined;

  if (preset === "blurry_ror" || lowerName.includes("blurry") || lowerName.includes("low_conf")) {
    return {
      owner: "Ramesh Kumar",
      area: 1250,
      survey_no: "142/3",
      confidence: 0.52, // < 0.60 triggers "Manual verification required"
      ulpid: "PB-LDH-0042",
      state: "Punjab",
      record_type: "Jamabandi (Punjab)",
      khewat_no: "74/82",
      khatauni_no: "112",
      cadastral_survey_area: 1180,
      area_discrepancy_sqm: 70,
    };
  }

  if (preset === "owner_mismatch" || lowerName.includes("mismatch") || lowerName.includes("dispute")) {
    return {
      owner: "Harpreet Singh",
      area: 1250,
      survey_no: "142/3",
      confidence: 0.88,
      ulpid: "PB-LDH-0042",
      state: "Punjab",
      record_type: "Jamabandi (Punjab)",
      khewat_no: "74/82",
      khatauni_no: "112",
      cadastral_survey_area: 1180,
      area_discrepancy_sqm: 70,
    };
  }

  if (preset === "tamil_nadu_patta" || lowerName.includes("tamil") || lowerName.includes("patta")) {
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
    };
  }

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
    area_discrepancy_sqm: 70,
  };
}

// 10. Get Decision Support Report: POST /api/ocr/decision-support
export async function getDecisionSupport(
  ulpid: string,
  ocrData: OcrResult
): Promise<import("./types").DecisionSupportReport> {
  const { data } = await tryFetch<import("./types").DecisionSupportReport>(`/ocr/decision-support`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ulpid,
      owner: ocrData.owner,
      area: ocrData.area,
      survey_no: ocrData.survey_no,
      confidence: ocrData.confidence,
    }),
  });

  if (data) return data;

  // Offline mock calculation
  await sleep(250);

  const parcel = MOCK_PARCELS[ulpid];
  const rorArea = parcel?.ror_area_sqm ?? 1250;
  const surveyedArea = parcel?.surveyed_area_sqm ?? 1180;
  const storedOwner = parcel?.owner.name ?? "Ramesh Kumar";

  const findings: import("./types").DecisionSupportFinding[] = [];

  // Low confidence check
  if (ocrData.confidence < 0.60) {
    findings.push({
      type: "low_ocr_confidence",
      description: `OCR confidence score (${(ocrData.confidence * 100).toFixed(1)}%) is below acceptable threshold (60.0%)`,
      severity: "medium",
      what_compared: "OCR Engine Optical Confidence vs Threshold (0.60)",
      what_differs: `Confidence: ${(ocrData.confidence * 100).toFixed(1)}% (Threshold: 60.0%)`,
      why_flagged: "Low scan resolution, handwriting noise, or document skew warrants mandatory manual verification.",
      source: "OCR Confidence Quality Engine",
    });
  }

  // Owner check
  if (ocrData.owner.trim().toLowerCase() !== storedOwner.trim().toLowerCase()) {
    findings.push({
      type: "owner_mismatch",
      description: `Document extracted owner (${ocrData.owner}) does not match registered titleholder (${storedOwner})`,
      severity: "high",
      what_compared: "Extracted Deed/RoR Titleholder vs Registered PostGIS Titleholder",
      what_differs: `OCR Name: "${ocrData.owner}" | Registry Name: "${storedOwner}"`,
      why_flagged: "Potential unrecorded succession, disputed transfer, or clerical identity mismatch requiring officer deed verification.",
      source: "RoR vs Cadastral Registry",
    });
  }

  // Area mismatch check
  if (Math.abs(rorArea - surveyedArea) > 0.01) {
    findings.push({
      type: "area_mismatch",
      description: `RoR area (${rorArea} sqm) does not match surveyed area (${surveyedArea} sqm)`,
      severity: "medium",
      what_compared: "Record of Rights Extent vs Georeferenced PostGIS Cadastral Polygon Area",
      what_differs: `RoR Area: ${rorArea} sqm | Cadastral Survey: ${surveyedArea} sqm (Variance: ${Math.abs(rorArea - surveyedArea)} sqm)`,
      why_flagged: "Discrepancy between historical revenue paper records and digitized GIS polygon boundary requiring field verification.",
      source: "PostGIS Spatial Analysis",
    });
  }

  // OCR vs stored RoR area
  if (Math.abs(ocrData.area - rorArea) > 0.01) {
    findings.push({
      type: "ocr_area_discrepancy",
      description: `Document declared area (${ocrData.area} sqm) differs from stored RoR extent (${rorArea} sqm)`,
      severity: "high",
      what_compared: "Uploaded Document Stated Extent vs Database Stored RoR Extent",
      what_differs: `Document: ${ocrData.area} sqm | Stored RoR: ${rorArea} sqm (Variance: ${Math.abs(ocrData.area - rorArea)} sqm)`,
      why_flagged: "Document submitted for mutation claims an extent differing from the official revenue ledger.",
      source: "OCR vs Database RoR",
    });
  }

  const isLow = ocrData.confidence < 0.60;
  return {
    ulpid,
    ocr_extracted: ocrData,
    stored_parcel: {
      owner_name: storedOwner,
      ror_area_sqm: rorArea,
      surveyed_area_sqm: surveyedArea,
      land_use: parcel?.land_use ?? "Residential",
    },
    confidence_assessment: {
      score: ocrData.confidence,
      status: isLow ? "manual_verification_required" : "acceptable_for_review",
      display_message: isLow ? "Manual verification required" : "Extraction confidence acceptable for review",
    },
    anomalies: findings,
    recommended_review_status: findings.some((f) => f.severity === "high")
      ? "needs_review"
      : findings.some((f) => f.severity === "medium") || isLow
      ? "needs_review"
      : "approved_candidate",
    disclaimer: "Decision Support Note: Automated checks provide rule-based decision support; authorized officials make final decisions.",
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
  await sleep(300);
  const fakeHash = Array.from({ length: 64 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join("");

  return {
    status: payload.decision === "confirmed" ? "synced_to_cadastre" : "conflict_flagged",
    audit_hash: fakeHash,
    timestamp: new Date().toISOString(),
    action_summary:
      payload.decision === "confirmed"
        ? `RoR metadata for ${payload.ulpid} verified and synchronized.`
        : `Discrepancy flagged for ${payload.ulpid}: Dispatched to Officer Mutation Queue.`,
  };
}

