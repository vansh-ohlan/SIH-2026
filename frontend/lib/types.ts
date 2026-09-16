export type UserRole = "citizen" | "revenue_officer" | "registrar" | "admin";

export interface AuthUser {
  userId: string;
  role: UserRole;
  name?: string;
  officerId?: string;
}

export interface DevTokenResponse {
  token: string;
  expiresIn: string;
  user: AuthUser;
}

export interface Geometry {
  type: "Polygon";
  coordinates: number[][][];
}

export interface Mutation {
  date: string;
  type: string;
  from: string;
  to: string;
}

export interface TaxStatus {
  paid: boolean;
  last_paid: string;
  dues: number;
}

export interface LedgerReceipt {
  certificate_id: string;
  block_number: number;
  block_hash: string;
  previous_hash: string;
  merkle_root: string;
  timestamp: string;
  signing_authority: string;
  jurisdiction: string;
  verification_status: "verified_tamper_evident" | "verified_immutable" | "audit_pending";
}

export interface Parcel {
  parcel_id?: string;
  ulpid: string;
  ulpin?: string;
  geometry: Geometry;
  owner: { name: string; since: string; father_or_husband_name?: string };
  area_sqm: number;
  land_use: string;
  village?: string;
  district?: string;
  state?: string;
  tehsil?: string;
  record_status?: CitizenParcelStatus;
  tax_status: TaxStatus;
  mutations: Mutation[];
  ror_area_sqm?: number;
  surveyed_area_sqm?: number;
  khewat_no?: string;
  khatauni_no?: string;
  survey_no?: string;
  valuation_band?: string;
  rate_per_sqm?: number;
  ledger_receipt?: LedgerReceipt;
}

export interface MultiSourceRecords {
  state_ror?: {
    khewat_no?: string;
    khatauni_no?: string;
    khasra_no?: string;
    declared_area_sqm: number;
    owner_name: string;
    last_mutation_date: string;
  };
  cadastral_gis?: {
    polygon_area_sqm: number;
    perimeter_m?: number;
    centroid: [number, number];
    srid: number;
    layer_name: string;
  };
  registration_ngdrs?: {
    deed_number?: string;
    registration_date?: string;
    registered_party?: string;
    encumbrance_status: "clear" | "mortgaged" | "disputed" | "under_review";
  };
  municipal_zoning?: {
    zone_code: string;
    permitted_use: string;
    circle_rate_per_sqm: number;
  };
}

export interface ParcelReconciliationFinding {
  field_compared: string;
  source_a_name: string;
  source_a_value: string | number;
  source_b_name: string;
  source_b_value: string | number;
  difference: string;
  reason: string;
  severity: Severity;
  recommended_action: "review" | "verify" | "no_action";
}

export interface ParcelReconciliationReport {
  parcel_id: string;
  ulpid: string;
  ulpin?: string;
  survey_no: string;
  owner_name: string;
  village: string;
  district: string;
  state: string;
  record_status: CitizenParcelStatus;
  findings: ParcelReconciliationFinding[];
  has_conflicts: boolean;
  source_records: MultiSourceRecords;
  confidence_score: number;
  disclaimer: string;
}


export interface SearchResult {
  ulpid: string;
  name: string;
  lat: number;
  lng: number;
}

export type Severity = "low" | "medium" | "high";

export interface Conflict {
  type: string;
  description: string;
  severity: Severity;
}

export interface MutationDecisionRequest {
  decision: "approved" | "rejected" | "needs_review";
  officer_id: string;
  notes: string;
}

export interface MutationDecisionResponse {
  status: string;
  audit_hash: string;
  timestamp: string;
}

export interface ApiError {
  error: string;
  message: string;
}

export interface GeoFeatureProperties {
  ulpid: string;
  land_use: string;
  owner_name?: string;
  area_sqm?: number;
  zoning?: string;
  tax_band?: string;
  tax_arrears?: boolean;
  rate_per_sqm?: number;
  annual_tax?: number;
}

export interface GeoFeature {
  type: "Feature";
  properties: GeoFeatureProperties;
  geometry: Geometry;
}

export interface GeoFeatureCollection {
  type: "FeatureCollection";
  features: GeoFeature[];
}

export type RegionId = "punjab" | "chandigarh" | "tamil_nadu";

export interface PilotRegion {
  id: RegionId;
  name: string;
  state: string;
  center: [number, number];
  zoom: number;
  description: string;
}

export interface EncroachmentAlert {
  id: string;
  ulpid: string;
  region_id: RegionId;
  confidence: number;
  description: string;
  area_sqm: number;
  detected_date: string;
  severity: Severity;
  type: "unauthorized_construction" | "boundary_push" | "eco_fringe_violation";
  coordinates: number[][][];
}

export interface UtilityLine {
  id: string;
  name: string;
  region_id: RegionId;
  type: "power_grid" | "water_main" | "stormwater_drain";
  specification: string;
  voltage_or_flow?: string;
  safety_buffer_meters?: number;
  coordinates: [number, number][];
  buffer_polygon?: [number, number][];
}

export interface QueuedConflict extends Conflict {
  ulpid: string;
  owner: string;
  area_sqm?: number;
  land_use?: string;
  ror_area_sqm?: number;
  surveyed_area_sqm?: number;
}

export interface OcrBoundingBox {
  field: string;
  label: string;
  value: string;
  confidence: number;
  top: string;
  left: string;
  width: string;
  height: string;
}

export interface OcrResult {
  owner: string;
  area: number;
  survey_no: string;
  confidence: number;
  ulpid?: string;
  state?: string;
  record_type?: string;
  khewat_no?: string;
  khatauni_no?: string;
  patta_no?: string;
  sub_division?: string;
  cadastral_survey_area?: number;
  area_discrepancy_sqm?: number;
  bounding_boxes?: OcrBoundingBox[];
  audit_hash?: string;
}

export interface DecisionSupportFinding {
  type: string;
  description: string;
  severity: Severity;
  what_compared: string;
  what_differs: string;
  why_flagged: string;
  source: string;
}

export interface DecisionSupportReport {
  ulpid: string;
  ocr_extracted: OcrResult;
  stored_parcel: {
    owner_name: string;
    ror_area_sqm: number;
    surveyed_area_sqm: number;
    land_use: string;
  } | null;
  confidence_assessment: {
    score: number;
    status: "manual_verification_required" | "acceptable_for_review";
    display_message: string;
  };
  anomalies: DecisionSupportFinding[];
  recommended_review_status: "approved_candidate" | "needs_review" | "disputed";
  disclaimer: string;
}

export type CitizenParcelStatus = "Verified" | "Under Review" | "Needs Verification" | "Conflict Detected";

