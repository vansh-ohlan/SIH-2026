import { gisService } from '../../src/gis';
import { PolygonGeometry } from '../../src/models/parcel';

describe('GisService', () => {
  it('should correctly calculate bounding box for a given polygon geometry', () => {
    const geometry: PolygonGeometry = {
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
    };

    const bbox = gisService.calculateBBox(geometry);

    expect(bbox).toEqual({
      minLng: 75.85,
      minLat: 30.90,
      maxLng: 75.86,
      maxLat: 30.91
    });
  });
});
