import { PolygonGeometry } from '../../models/parcel';
import { logger } from '../../utils/logger';

export interface BhuNakshaParcelGeometry {
  ulpid: string;
  srid: number;
  geometry: PolygonGeometry;
  calculated_area_sqm: number;
  perimeter_meters: number;
  centroid: [number, number];
  layer_name: string;
}

export interface IBhuNakshaGisAdapter {
  fetchParcelGeometry(ulpid: string): Promise<BhuNakshaParcelGeometry | null>;
}

/**
 * Adapter for Bhu-Naksha / PostGIS Cadastral GIS Vector Layers.
 * Represents georeferenced spatial parcel boundary geometries in EPSG:4326.
 */
export class BhuNakshaGisAdapter implements IBhuNakshaGisAdapter {
  public async fetchParcelGeometry(ulpid: string): Promise<BhuNakshaParcelGeometry | null> {
    logger.info(`[DEMO ADAPTER] Fetching Bhu-Naksha cadastral boundary for ULPID: ${ulpid}`);

    const syntheticGisData: Record<string, BhuNakshaParcelGeometry> = {
      'PB-LDH-0042': {
        ulpid: 'PB-LDH-0042',
        srid: 4326,
        geometry: {
          type: 'Polygon',
          coordinates: [[[75.85, 30.90], [75.86, 30.90], [75.86, 30.91], [75.85, 30.91], [75.85, 30.90]]]
        },
        calculated_area_sqm: 1180, // 70 sqm variance with RoR (1250)
        perimeter_meters: 142.5,
        centroid: [30.905, 75.855],
        layer_name: 'PB_Ludhiana_Cadastral_2026'
      },
      'PB-LDH-0043': {
        ulpid: 'PB-LDH-0043',
        srid: 4326,
        geometry: {
          type: 'Polygon',
          coordinates: [[[75.86, 30.90], [75.87, 30.90], [75.87, 30.91], [75.86, 30.91], [75.86, 30.90]]]
        },
        calculated_area_sqm: 980,
        perimeter_meters: 125.0,
        centroid: [30.905, 75.865],
        layer_name: 'PB_Ludhiana_Cadastral_2026'
      },
      'CH-SEC-1701': {
        ulpid: 'CH-SEC-1701',
        srid: 4326,
        geometry: {
          type: 'Polygon',
          coordinates: [[[76.775, 30.730], [76.782, 30.730], [76.782, 30.736], [76.775, 30.736], [76.775, 30.730]]]
        },
        calculated_area_sqm: 2400,
        perimeter_meters: 200.0,
        centroid: [30.733, 76.779],
        layer_name: 'CH_Urban_Cadastre_2026'
      },
      'TN-SPR-0814': {
        ulpid: 'TN-SPR-0814',
        srid: 4326,
        geometry: {
          type: 'Polygon',
          coordinates: [[[79.970, 12.980], [79.975, 12.980], [79.975, 12.985], [79.970, 12.985], [79.970, 12.980]]]
        },
        calculated_area_sqm: 3200,
        perimeter_meters: 226.0,
        centroid: [12.982, 79.973],
        layer_name: 'TN_Sriperumbudur_Cadastre_2026'
      }
    };

    return syntheticGisData[ulpid] ?? null;
  }
}

export const bhuNakshaGisAdapter = new BhuNakshaGisAdapter();
