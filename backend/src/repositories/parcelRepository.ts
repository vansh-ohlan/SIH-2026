import {
  ParcelRecord,
  ParcelSearchResult,
  ConflictItem
} from '../models/parcel';
import { GeoJsonFeatureCollection } from '../models/geojson';
import { postgisParcelRepository } from './postgisParcelRepository';

/**
 * Interface defining parcel data access operations.
 * PostgreSQL + PostGIS is the source of truth for parcel data.
 */
export interface IParcelRepository {
  findByUlpid(ulpid: string): Promise<ParcelRecord | null>;
  search(query: string): Promise<ParcelSearchResult[]>;
  findConflictsByUlpid(ulpid: string): Promise<ConflictItem[]>;
  getAllGeoJson(): Promise<GeoJsonFeatureCollection>;
}

// Default production repository is PostgreSQL + PostGIS
export const parcelRepository: IParcelRepository = postgisParcelRepository;
export { postgisParcelRepository };
