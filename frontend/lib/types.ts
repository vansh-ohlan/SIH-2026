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
  verification_status: "verified_immutable" | "audit_pending";
}

export interface Parcel {
  ulpid: string;
  geometry: Geometry;
  owner: { name: string; since: string };
  area_sqm: number;
  land_use: string;
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
