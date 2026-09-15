import { db } from '../db/pool';
import { IParcelRepository } from './parcelRepository';
import {
  ParcelRecord,
  ParcelSearchResult,
  ConflictItem,
  PolygonGeometry
} from '../models/parcel';
import { GeoJsonFeatureCollection } from '../models/geojson';
import { gisEngine } from '../gis';

interface ParcelRow {
  ulpid: string;
  owner_name: string;
  owner_since: string;
  area_sqm: number;
  land_use: string;
  tax_paid: boolean;
  tax_last_paid: string;
  tax_dues: number;
  ror_area_sqm: number;
  surveyed_area_sqm: number;
  geometry: PolygonGeometry;
  mutations: Array<{
    date: string;
    type: string;
    from: string;
    to: string;
  }>;
}

export class PostgisParcelRepository implements IParcelRepository {
  public async findByUlpid(ulpid: string): Promise<ParcelRecord | null> {
    const query = `
      SELECT 
        p.ulpid,
        p.owner_name,
        TO_CHAR(p.owner_since, 'YYYY-MM-DD') AS owner_since,
        p.area_sqm::float AS area_sqm,
        p.land_use,
        p.tax_paid,
        TO_CHAR(p.tax_last_paid, 'YYYY-MM-DD') AS tax_last_paid,
        p.tax_dues::float AS tax_dues,
        p.ror_area_sqm::float AS ror_area_sqm,
        p.surveyed_area_sqm::float AS surveyed_area_sqm,
        ST_AsGeoJSON(p.geometry)::json AS geometry,
        COALESCE(
          json_agg(
            json_build_object(
              'date', TO_CHAR(m.mutation_date, 'YYYY-MM-DD'),
              'type', m.mutation_type,
              'from', m.from_owner,
              'to', m.to_owner
            ) ORDER BY m.mutation_date ASC, m.created_at ASC
          ) FILTER (WHERE m.id IS NOT NULL),
          '[]'::json
        ) AS mutations
      FROM parcels p
      LEFT JOIN mutations m ON p.id = m.parcel_id
      WHERE p.ulpid = $1
      GROUP BY p.id;
    `;

    const res = await db.query<ParcelRow>(query, [ulpid]);
    if (res.rows.length === 0) {
      return null;
    }

    const row = res.rows[0];
    return {
      ulpid: row.ulpid,
      geometry: row.geometry,
      owner: {
        name: row.owner_name,
        since: row.owner_since
      },
      area_sqm: row.area_sqm,
      land_use: row.land_use,
      tax_status: {
        paid: row.tax_paid,
        last_paid: row.tax_last_paid || '',
        dues: row.tax_dues
      },
      mutations: row.mutations || []
    };
  }

  public async search(query: string): Promise<ParcelSearchResult[]> {
    const trimmed = query.trim();
    if (!trimmed) {
      return [];
    }

    const sql = `
      SELECT 
        ulpid,
        owner_name AS name,
        ROUND(ST_Y(ST_Centroid(geometry))::numeric, 4)::float AS lat,
        ROUND(ST_X(ST_Centroid(geometry))::numeric, 4)::float AS lng
      FROM parcels
      WHERE 
        LOWER(owner_name) LIKE LOWER($1) 
        OR LOWER(ulpid) LIKE LOWER($1)
      ORDER BY ulpid ASC;
    `;

    const searchPattern = `%${trimmed}%`;
    const res = await db.query<{
      ulpid: string;
      name: string;
      lat: number;
      lng: number;
    }>(sql, [searchPattern]);

    return res.rows.map((r) => ({
      ulpid: r.ulpid,
      name: r.name,
      lat: r.lat,
      lng: r.lng
    }));
  }

  public async findConflictsByUlpid(ulpid: string): Promise<ConflictItem[]> {
    const sql = `
      SELECT 
        ror_area_sqm::float AS ror_area_sqm,
        surveyed_area_sqm::float AS surveyed_area_sqm
      FROM parcels
      WHERE ulpid = $1;
    `;

    const res = await db.query<{
      ror_area_sqm: number;
      surveyed_area_sqm: number;
    }>(sql, [ulpid]);

    if (res.rows.length === 0) {
      return [];
    }

    const { ror_area_sqm, surveyed_area_sqm } = res.rows[0];
    const conflict = gisEngine.detectAreaMismatch(ror_area_sqm, surveyed_area_sqm);
    return conflict ? [conflict] : [];
  }

  /**
   * Calculates geodesic surface area in square metres using PostGIS ST_Area(geometry::geography).
   * Verifies that EPSG:4326 geometry is computed as spherical/ellipsoidal coordinates rather than planar degrees.
   */
  public async getCalculatedAreaSqm(ulpid: string): Promise<number | null> {
    const sql = `
      SELECT ST_Area(geometry::geography)::float AS calculated_area_sqm
      FROM parcels
      WHERE ulpid = $1;
    `;

    const res = await db.query<{ calculated_area_sqm: number }>(sql, [ulpid]);
    if (res.rows.length === 0) {
      return null;
    }
    return res.rows[0].calculated_area_sqm;
  }

  public async getAllGeoJson(): Promise<GeoJsonFeatureCollection> {
    const sql = `
      SELECT 
        ulpid,
        land_use,
        ST_AsGeoJSON(geometry)::json AS geometry
      FROM parcels
      ORDER BY ulpid ASC;
    `;

    const res = await db.query<{
      ulpid: string;
      land_use: string;
      geometry: PolygonGeometry;
    }>(sql);

    return {
      type: 'FeatureCollection',
      features: res.rows.map((row) => ({
        type: 'Feature',
        properties: {
          ulpid: row.ulpid,
          land_use: row.land_use
        },
        geometry: row.geometry
      }))
    };
  }
}

export const postgisParcelRepository = new PostgisParcelRepository();
