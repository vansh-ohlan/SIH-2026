import request from 'supertest';
import { createApp } from '../../src/app/createApp';
import { db } from '../../src/db/pool';

describe('GET /api/map/parcels (PostgreSQL + PostGIS backed)', () => {
  const app = createApp();

  afterAll(async () => {
    await db.close();
  });

  it('should return a valid GeoJSON FeatureCollection with exact response structure from PostGIS', async () => {
    const mockGeometry = {
      type: 'Polygon' as const,
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

    const querySpy = jest.spyOn(db, 'query').mockResolvedValueOnce({
      rows: [
        {
          ulpid: 'PB-LDH-0042',
          land_use: 'Residential',
          geometry: mockGeometry
        },
        {
          ulpid: 'PB-LDH-0043',
          land_use: 'Commercial',
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
          }
        }
      ],
      rowCount: 2,
      command: 'SELECT',
      oid: 0,
      fields: []
    });

    const res = await request(app)
      .get('/api/map/parcels')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(querySpy).toHaveBeenCalled();
    expect(res.body).toHaveProperty('type', 'FeatureCollection');
    expect(res.body).toHaveProperty('features');
    expect(Array.isArray(res.body.features)).toBe(true);
    expect(res.body.features.length).toBe(2);

    const feature = res.body.features[0];
    expect(feature).toHaveProperty('type', 'Feature');
    expect(feature).toHaveProperty('properties');
    expect(feature.properties).toHaveProperty('ulpid', 'PB-LDH-0042');
    expect(feature.properties).toHaveProperty('land_use', 'Residential');
    expect(feature).toHaveProperty('geometry');
    expect(feature.geometry).toEqual(mockGeometry);

    querySpy.mockRestore();
  });
});
