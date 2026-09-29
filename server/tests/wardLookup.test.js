import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { createTestDatabase } from './setup/testDatabase.js';

describe('POST /api/locations/resolve', () => {
  let db;
  let app;

  beforeAll(async () => {
    db = await createTestDatabase();
    app = createApp({
      db,
      geocoder: {
        reverse: async () => ({ street: 'Test Road', area: 'Test Area' })
      },
      frontendDist: '/tmp/gba-civic-tracker-no-build'
    });
  });

  afterAll(async () => {
    if (db) {
      await db.close();
    }
  });

  it.each([
    [12.972, 77.593, 'Sample Ward A'],
    [12.972, 77.603, 'Sample Ward B'],
    [12.98, 77.593, 'Sample Ward C']
  ])('maps (%s, %s) to %s', async (lat, lng, wardName) => {
    const response = await request(app)
      .post('/api/locations/resolve')
      .send({ lat, lng });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      ward: expect.objectContaining({ name: wardName }),
      street: 'Test Road',
      area: 'Test Area',
      inPilotArea: true
    });
  });

  it('returns an outside-pilot result without reverse geocoding', async () => {
    const response = await request(app)
      .post('/api/locations/resolve')
      .send({ lat: 12.99, lng: 77.62 });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      ward: null,
      street: null,
      area: null,
      inPilotArea: false
    });
  });

  it.each([{},{ lat: 999, lng: 77.593 }])('rejects invalid coordinates', async (body) => {
    const response = await request(app)
      .post('/api/locations/resolve')
      .send(body);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      status: 400,
      code: 'INVALID_LOCATION',
      message: 'lat and lng must be valid geographic coordinates.'
    });
  });
});
