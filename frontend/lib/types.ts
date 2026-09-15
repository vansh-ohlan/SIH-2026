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
  valuation_band?: "Band A (Prime Commercial)" | "Band B (Standard Residential)" | "Band C (Agricultural/Rural)";
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
  state?: "Punjab" | "Tamil Nadu" | "Chandigarh";
  record_type?: "Jamabandi (Punjab)" | "Patta / Chitta (Tamil Nadu)" | "Urban Allotment (Chandigarh)";
  khewat_no?: string;
  khatauni_no?: string;
  patta_no?: string;
  sub_division?: string;
  cadastral_survey_area?: number;
  area_discrepancy_sqm?: number;
  bounding_boxes?: OcrBoundingBox[];
  audit_hash?: string;
}

export interface ApiError {
  error: string;
  message: string;
}

export interface GeoFeatureProperties {
  ulpid: string;
  land_use: string;
  zoning?: "Residential" | "Commercial" | "Agricultural" | "Industrial" | "Restriction Zone" | "Eco-Sensitive";
  tax_band?: "Band A (Prime Commercial)" | "Band B (Standard Residential)" | "Band C (Agricultural/Rural)";
  tax_arrears?: boolean;
  owner_name?: string;
  area_sqm?: number;
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

// Multi-State Pilot Regions for Land Stack
export type RegionId = "punjab" | "chandigarh" | "tamil_nadu";

export interface PilotRegion {
  id: RegionId;
  name: string;
  state: string;
  center: [number, number];
  zoom: number;
  description: string;
}

// AI/ML Change Detection & Encroachment Overlay
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
  coordinates: number[][][]; // GeoJSON polygon format
}

// Utility Infrastructure Lines for Use-Case Layer
export interface UtilityLine {
  id: string;
  name: string;
  region_id: RegionId;
  type: "power_grid" | "water_main" | "stormwater_drain";
  specification: string;
  voltage_or_flow?: string;
  safety_buffer_meters?: number;
  coordinates: [number, number][]; // LineString coordinates [lat, lng]
  buffer_polygon?: [number, number][]; // Geometric safety clearance buffer zone
}

// Convenience type used by the officer queue view — a conflict tagged with
// the parcel it belongs to, since /parcel/{ulpid}/conflicts is per-parcel.
export interface QueuedConflict extends Conflict {
  ulpid: string;
  owner: string;
}

