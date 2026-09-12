import { PolygonGeometry } from './parcel';

export interface GeoJsonFeatureProperties {
  ulpid: string;
  land_use: string;
}

export interface GeoJsonFeature {
  type: 'Feature';
  properties: GeoJsonFeatureProperties;
  geometry: PolygonGeometry;
}

export interface GeoJsonFeatureCollection {
  type: 'FeatureCollection';
  features: GeoJsonFeature[];
}
