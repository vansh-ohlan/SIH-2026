export interface PolygonGeometry {
  type: 'Polygon';
  coordinates: number[][][];
}

export interface OwnerInfo {
  name: string;
  since: string;
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

export interface ParcelRecord {
  ulpid: string;
  geometry: PolygonGeometry;
  owner: OwnerInfo;
  area_sqm: number;
  land_use: string;
  tax_status: TaxStatus;
  mutations: MutationHistoryItem[];
  ror_area_sqm?: number;
  surveyed_area_sqm?: number;
}

export interface ParcelSearchResult {
  ulpid: string;
  name: string;
  lat: number;
  lng: number;
}

export type ConflictSeverity = 'low' | 'medium' | 'high';

export interface ConflictItem {
  type: string;
  description: string;
  severity: ConflictSeverity;
}
