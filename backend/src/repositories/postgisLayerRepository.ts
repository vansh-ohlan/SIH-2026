import { db } from '../db/pool';
import { EncroachmentAlertRow, UtilityLineRow } from '../models/layers';

export interface ILayerRepository {
  getEncroachmentsByRegion(regionId: string): Promise<any[]>;
  getUtilitiesByRegion(regionId: string): Promise<any[]>;
}

export class PostgisLayerRepository implements ILayerRepository {
  public async getEncroachmentsByRegion(regionId: string): Promise<any[]> {
    const sql = `
      SELECT 
        id,
        ulpid,
        region_id,
        confidence::float as confidence,
        description,
        area_sqm::float as area_sqm,
        TO_CHAR(detected_date, 'YYYY-MM-DD') as detected_date,
        severity,
        type,
        ST_AsGeoJSON(geometry)::json as geometry
      FROM encroachment_alerts
      WHERE region_id = $1
      ORDER BY created_at DESC;
    `;

    const res = await db.query<EncroachmentAlertRow>(sql, [regionId]);
    return res.rows.map(row => ({
      id: row.id,
      ulpid: row.ulpid,
      region_id: row.region_id,
      confidence: row.confidence,
      description: row.description,
      area_sqm: row.area_sqm,
      detected_date: row.detected_date,
      severity: row.severity,
      type: row.type,
      // Frontend expects the coordinate array from the Polygon
      coordinates: row.geometry.coordinates
    }));
  }

  public async getUtilitiesByRegion(regionId: string): Promise<any[]> {
    const sql = `
      SELECT 
        id,
        region_id,
        name,
        type,
        specification,
        voltage_or_flow,
        safety_buffer_meters::float as safety_buffer_meters,
        ST_AsGeoJSON(geometry)::json as geometry,
        ST_AsGeoJSON(buffer_geometry)::json as buffer_geometry
      FROM utility_lines
      WHERE region_id = $1
      ORDER BY created_at DESC;
    `;

    const res = await db.query<UtilityLineRow>(sql, [regionId]);
    return res.rows.map(row => ({
      id: row.id,
      name: row.name,
      region_id: row.region_id,
      type: row.type,
      specification: row.specification,
      voltage_or_flow: row.voltage_or_flow,
      safety_buffer_meters: row.safety_buffer_meters,
      // Frontend expects coordinates as an array of [lng, lat]
      coordinates: row.geometry.coordinates,
      buffer_polygon: row.buffer_geometry ? row.buffer_geometry.coordinates[0] : undefined
    }));
  }
}

export const postgisLayerRepository = new PostgisLayerRepository();
