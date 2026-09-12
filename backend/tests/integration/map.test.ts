import request from 'supertest';
import { createApp } from '../../src/app/createApp';

describe('GET /api/map/parcels', () => {
  const app = createApp();

  it('should return a valid GeoJSON FeatureCollection with exact response structure', async () => {
    const res = await request(app)
      .get('/api/map/parcels')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(res.body).toHaveProperty('type', 'FeatureCollection');
    expect(res.body).toHaveProperty('features');
    expect(Array.isArray(res.body.features)).toBe(true);
    expect(res.body.features.length).toBeGreaterThan(0);

    const feature = res.body.features[0];
    expect(feature).toHaveProperty('type', 'Feature');
    expect(feature).toHaveProperty('properties');
    expect(feature.properties).toHaveProperty('ulpid');
    expect(feature.properties).toHaveProperty('land_use');
    expect(feature).toHaveProperty('geometry');
    expect(feature.geometry).toHaveProperty('type', 'Polygon');
    expect(feature.geometry).toHaveProperty('coordinates');
    expect(Array.isArray(feature.geometry.coordinates)).toBe(true);

    // Verify sample parcel PB-LDH-0042 in the features list
    const p42 = res.body.features.find(
      (f: { properties: { ulpid: string } }) => f.properties.ulpid === 'PB-LDH-0042'
    );
    expect(p42).toBeDefined();
    expect(p42.properties).toEqual({
      ulpid: 'PB-LDH-0042',
      land_use: 'Residential'
    });
    expect(p42.geometry).toEqual({
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
    });
  });
});
