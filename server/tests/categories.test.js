import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/application.js';
import { createTestDatabase } from './setup/testDatabase.js';

describe('GET /api/categories', () => {
  let db;
  let app;

  beforeAll(async () => {
    db = await createTestDatabase();
    await db.query(
      `INSERT INTO categories (code, name, reportable)
       VALUES ('FUTURE_TEST', 'Future Test Category', FALSE)`
    );
    app = createApp({ db, frontendDist: '/tmp/gba-civic-tracker-no-build' });
  });

  afterAll(async () => {
    if (db) {
      await db.close();
    }
  });

  it('returns all and only reportable categories', async () => {
    const response = await request(app).get('/api/categories');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      categories: [
        { code: 'FOOTPATH_ENCROACHMENT', name: 'Footpath Encroachment' },
        { code: 'ROAD_DAMAGE', name: 'Potholes / Road Damage' },
        { code: 'GARBAGE_DUMPING', name: 'Garbage Dumping' }
      ]
    });
  });
});
