export interface EncroachmentAlertRow {
  id: string;
  ulpid: string;
  region_id: string;
  confidence: number;
  description: string;
  area_sqm: number;
  detected_date: string;
  severity: string;
  type: string;
  geometry: any;
}

export interface UtilityLineRow {
  id: string;
  region_id: string;
  name: string;
  type: string;
  specification: string;
  voltage_or_flow: string | null;
  safety_buffer_meters: number | null;
  geometry: any;
  buffer_geometry: any | null;
}
