import {
  ParcelRecord,
  ParcelSearchResult,
  ConflictItem
} from '../models/parcel';
import { GeoJsonFeatureCollection } from '../models/geojson';

/**
 * Interface defining parcel data access operations.
 * Allows seamless switching between in-memory mock repository and PostGIS/PostgreSQL.
 */
export interface IParcelRepository {
  findByUlpid(ulpid: string): Promise<ParcelRecord | null>;
  search(query: string): Promise<ParcelSearchResult[]>;
  findConflictsByUlpid(ulpid: string): Promise<ConflictItem[]>;
  getAllGeoJson(): Promise<GeoJsonFeatureCollection>;
}

/**
 * SYNTHETIC / MOCK DATASET for SIH 2026 Demo.
 * In production, these records will be fetched from PostGIS and state land registries.
 */
const MOCK_PARCELS: Record<string, ParcelRecord> = {
  'PB-LDH-0042': {
    ulpid: 'PB-LDH-0042',
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [75.85, 30.90],
          [75.86, 30.90],
          [75.86, 30.91],
          [75.85, 30.91],
          [75.85, 30.90]
        ]
      ]
    },
    owner: {
      name: 'Ramesh Kumar',
      since: '2011-04-12'
    },
    area_sqm: 1250,
    land_use: 'Residential',
    tax_status: {
      paid: true,
      last_paid: '2026-03-01',
      dues: 0
    },
    mutations: [
      {
        date: '2011-04-12',
        type: 'Sale',
        from: 'State',
        to: 'Ramesh Kumar'
      }
    ]
  },
  'PB-LDH-0043': {
    ulpid: 'PB-LDH-0043',
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [75.86, 30.90],
          [75.87, 30.90],
          [75.87, 30.91],
          [75.86, 30.91],
          [75.86, 30.90]
        ]
      ]
    },
    owner: {
      name: 'Suresh Singh',
      since: '2018-09-20'
    },
    area_sqm: 980,
    land_use: 'Commercial',
    tax_status: {
      paid: true,
      last_paid: '2026-02-15',
      dues: 0
    },
    mutations: [
      {
        date: '2018-09-20',
        type: 'Inheritance',
        from: 'Gurdev Singh',
        to: 'Suresh Singh'
      }
    ]
  }
};

const MOCK_CONFLICTS: Record<string, ConflictItem[]> = {
  'PB-LDH-0042': [
    {
      type: 'area_mismatch',
      description: 'RoR area (1250 sqm) does not match surveyed area (1180 sqm)',
      severity: 'medium'
    }
  ]
};

export class MockParcelRepository implements IParcelRepository {
  public async findByUlpid(ulpid: string): Promise<ParcelRecord | null> {
    const parcel = MOCK_PARCELS[ulpid];
    return parcel ? JSON.parse(JSON.stringify(parcel)) : null;
  }

  public async search(query: string): Promise<ParcelSearchResult[]> {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) {
      return [];
    }

    const results: ParcelSearchResult[] = [];

    for (const parcel of Object.values(MOCK_PARCELS)) {
      const matchOwner = parcel.owner.name.toLowerCase().includes(trimmed);
      const matchUlpid = parcel.ulpid.toLowerCase().includes(trimmed);

      if (matchOwner || matchUlpid) {
        // Calculate representative centroid coordinates (exclude repeated closing vertex)
        const rawCoords = parcel.geometry.coordinates[0];
        const uniqueCoords =
          rawCoords.length > 1 &&
          rawCoords[0][0] === rawCoords[rawCoords.length - 1][0] &&
          rawCoords[0][1] === rawCoords[rawCoords.length - 1][1]
            ? rawCoords.slice(0, -1)
            : rawCoords;

        const avgLng = uniqueCoords.reduce((acc, c) => acc + c[0], 0) / uniqueCoords.length;
        const avgLat = uniqueCoords.reduce((acc, c) => acc + c[1], 0) / uniqueCoords.length;

        results.push({
          ulpid: parcel.ulpid,
          name: parcel.owner.name,
          lat: Number(avgLat.toFixed(4)),
          lng: Number(avgLng.toFixed(4))
        });
      }
    }

    return results;
  }

  public async findConflictsByUlpid(ulpid: string): Promise<ConflictItem[]> {
    const conflicts = MOCK_CONFLICTS[ulpid];
    return conflicts ? JSON.parse(JSON.stringify(conflicts)) : [];
  }

  public async getAllGeoJson(): Promise<GeoJsonFeatureCollection> {
    const features = Object.values(MOCK_PARCELS).map((parcel) => ({
      type: 'Feature' as const,
      properties: {
        ulpid: parcel.ulpid,
        land_use: parcel.land_use
      },
      geometry: parcel.geometry
    }));

    return {
      type: 'FeatureCollection',
      features
    };
  }
}

export const parcelRepository = new MockParcelRepository();
