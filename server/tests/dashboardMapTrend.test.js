import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { createTestDatabase } from './setup/testDatabase.js';

describe('dashboard map and trend routes', () => {
  let db;
  let app;
  let verifierId;
  let categoryId;

  beforeAll(async () => {
    db = await createTestDatabase();
    verifierId = randomUUID();
    await db.query('INSERT INTO auth.users (id) VALUES ($1)', [verifierId]);
    await db.query("INSERT INTO staff (id, full_name, role) VALUES ($1, 'Verifier', 'VERIFIER')", [verifierId]);
    categoryId = (await db.query("SELECT id FROM categories WHERE code = 'ROAD_DAMAGE'")).rows[0].id;
    app = createApp({ db, frontendDist: '/tmp/gba-civic-tracker-no-build' });
  });

  afterAll(async () => { if (db) await db.close(); });

  async function addTicket({ createdAt, status = 'OPEN', lat = 12.972, lng = 77.593 }) {
    await db.query(
      `INSERT INTO tickets (public_code, category_id, description, lat, lng, ward_id, status, created_at,
                            closed_by, closed_at)
       VALUES ($1, $2, 'private description', $3, $4, 1, $5::varchar, $6,
               CASE WHEN $5::varchar = 'CLOSED' THEN $7::uuid END,
               CASE WHEN $5::varchar = 'CLOSED' THEN now() END)`,
      [randomUUID().slice(0, 12), categoryId, lat, lng, status, createdAt, verifierId]
    );
  }

  const get = (path) => request(app).get(`/api/dashboard/${path}`);

  it('returns empty lists when there are no tickets', async () => {
    expect((await get('map')).body).toEqual({ points: [] });
    expect((await get('trend')).body).toEqual({ interval: 'week', points: [] });
  });

  describe('with known tickets', () => {
    beforeAll(async () => {
      await addTicket({ createdAt: '2026-09-01T10:00:00Z', lat: 12.971, lng: 77.591 });
      await addTicket({ createdAt: '2026-09-02T10:00:00Z', status: 'CLOSED', lat: 12.972, lng: 77.592 });
      await addTicket({ createdAt: '2026-09-06T23:30:00Z', status: 'PENDING_VERIFICATION' });
      await addTicket({ createdAt: '2026-09-22T10:00:00Z', status: 'REOPENED' });
      await addTicket({ createdAt: '2026-10-07T10:00:00Z', status: 'IN_PROGRESS' });
    });

    it('counts complaints per week, filling empty weeks with 0 (weeks start on Monday, UTC)', async () => {
      const { status, body } = await get('trend?interval=week');

      expect(status).toBe(200);
      expect(body.interval).toBe('week');
      expect(body.points).toEqual([
        { periodStart: '2026-08-31', count: 3 },
        { periodStart: '2026-09-07', count: 0 },
        { periodStart: '2026-09-14', count: 0 },
        { periodStart: '2026-09-21', count: 1 },
        { periodStart: '2026-09-28', count: 0 },
        { periodStart: '2026-10-05', count: 1 }
      ]);
    });

    it('counts complaints per month', async () => {
      const { body } = await get('trend?interval=month');

      expect(body.points).toEqual([
        { periodStart: '2026-09-01', count: 4 },
        { periodStart: '2026-10-01', count: 1 }
      ]);
    });

    it('uses week when no interval is given, and the totals add up for both intervals', async () => {
      const total = (await get('summary')).body.total;

      expect((await get('trend')).body.interval).toBe('week');
      for (const interval of ['week', 'month']) {
        const { body } = await get(`trend?interval=${interval}`);
        expect(body.points.every((point) => typeof point.count === 'number')).toBe(true);
        expect(body.points.reduce((sum, point) => sum + point.count, 0)).toBe(total);
      }
    });

    it.each(['year', '', 'WEEK', 'week;drop'])('refuses interval "%s" with 400 in the standard error shape', async (interval) => {
      const response = await get(`trend?interval=${encodeURIComponent(interval)}`);

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({ status: 400, code: 'INVALID_INTERVAL' });
      expect(typeof response.body.message).toBe('string');
    });

    it('returns one point per ticket with only lat, lng and status', async () => {
      const { status, body } = await get('map');
      const ticketCount = (await db.query('SELECT count(*)::int AS total FROM tickets')).rows[0].total;

      expect(status).toBe(200);
      expect(body.points).toHaveLength(ticketCount);
      for (const point of body.points) {
        expect(Object.keys(point).sort()).toEqual(['lat', 'lng', 'status']);
        expect(typeof point.lat).toBe('number');
        expect(typeof point.lng).toBe('number');
      }
      expect(body.points.map((point) => point.status).sort()).toEqual(
        ['CLOSED', 'IN_PROGRESS', 'OPEN', 'PENDING_VERIFICATION', 'REOPENED']
      );
    });

    it('needs no login and exposes no private data', async () => {
      const bodies = (await Promise.all([get('map'), get('trend')])).map((response) => JSON.stringify(response.body));

      expect(bodies.join('')).not.toMatch(/private description|public_code|publicCode|storage|full_name/);
    });
  });
});
