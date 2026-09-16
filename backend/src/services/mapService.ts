import { IParcelRepository, parcelRepository } from '../repositories/parcelRepository';
import { GeoJsonFeatureCollection } from '../models/geojson';

export class MapService {
  constructor(private readonly repo: IParcelRepository = parcelRepository) {}

  public async getParcelsFeatureCollection(): Promise<GeoJsonFeatureCollection> {
    return this.repo.getAllGeoJson();
  }
}

export const mapService = new MapService();
