export interface PolygonGeometry {
  type: 'Polygon';
  coordinates: number[][][];
}

export interface OwnerInfo {
  name: string;
  since: string;
  father_or_husband_name?: string;
  share?: string;
}

export interface TaxStatus {
  paid: boolean;
  last_paid: string;
  dues: number;
}

export interface MutationHistoryItem {
  date: string;
  type: string;
  from: string;
  to: string;
}

export type RecordStatus = 'verified' | 'under_review' | 'needs_verification' | 'conflict_detected';

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
    encumbrance_status: 'clear' | 'mortgaged' | 'disputed' | 'under_review';
  };
  municipal_zoning?: {
    zone_code: string;
    permitted_use: string;
    circle_rate_per_sqm: number;
  };
}

export interface ParcelRecord {
  parcel_id?: string;
  ulpid: string;
  ulpin?: string;
  survey_no?: string;
  khasra_no?: string;
  geometry: PolygonGeometry;
  owner: OwnerInfo;
  area_sqm: number;
  ror_area_sqm?: number;
  surveyed_area_sqm?: number;
  land_use: string;
  village?: string;
  district?: string;
  state?: string;
  tehsil?: string;
  record_status?: RecordStatus;
  tax_status: TaxStatus;
  mutations: MutationHistoryItem[];
  source_records?: MultiSourceRecords;
}

export interface ParcelSearchResult {
  ulpid: string;
  name: string;
  lat: number;
  lng: number;
  survey_no?: string;
  village?: string;
  district?: string;
  record_status?: RecordStatus;
}

export type ConflictSeverity = 'low' | 'medium' | 'high';

export interface ConflictItem {
  type: string;
  description: string;
  severity: ConflictSeverity;
}

export type ReconciliationAction = 'review' | 'verify' | 'no_action';

export interface ParcelReconciliationFinding {
  field_compared: string;
  source_a_name: string;
  source_a_value: string | number;
  source_b_name: string;
  source_b_value: string | number;
  difference: string;
  reason: string;
  severity: ConflictSeverity;
  recommended_action: ReconciliationAction;
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
  record_status: RecordStatus;
  findings: ParcelReconciliationFinding[];
  has_conflicts: boolean;
  source_records: MultiSourceRecords;
  confidence_score: number;
  disclaimer: string;
}

