import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/application.js';
import { createTestDatabase } from './setup/testDatabase.js';

const isNumber = (value) => typeof value === 'number';

describe('public dashboard routes', () => {
  let db;
  let app;
  let verifierId;
  let categoryIds;
  let wardIds;

  beforeAll(async () => {
    db = await createTestDatabase();
    verifierId = randomUUID();
    await db.query('INSERT INTO auth.users (id) VALUES ($1)', [verifierId]);
    await db.query("INSERT INTO staff (id, full_name, role) VALUES ($1, 'Verifier', 'VERIFIER')", [verifierId]);
    categoryIds = Object.fromEntries(
      (await db.query('SELECT id, code FROM categories')).rows.map((row) => [row.code, row.id])
    );
    wardIds = (await db.query('SELECT id FROM wards ORDER BY name')).rows.map((row) => row.id);
    app = createApp({ db, frontendDist: '/tmp/gba-civic-tracker-no-build' });
  });

  afterAll(async () => { if (db) await db.close(); });

  async function addTicket({ ward, category, status, isDemo = false }) {
    await db.query(
      `INSERT INTO tickets (public_code, category_id, description, lat, lng, ward_id, status, is_demo,
                            closed_by, closed_at)
       VALUES ($1, $2, 'dashboard test', 12.972, 77.593, $3, $4::varchar, $5,
               CASE WHEN $4::varchar = 'CLOSED' THEN $6::uuid END,
               CASE WHEN $4::varchar = 'CLOSED' THEN now() END)`,
      [randomUUID().slice(0, 12), categoryIds[category], wardIds[ward], status, isDemo, verifierId]
    );
  }

  const get = (path) => request(app).get(`/api/dashboard/${path}`);

  describe('with no tickets', () => {
    it('returns zeros, a zero rate and no demo flag', async () => {
      const summary = await get('summary');
      expect(summary.status).toBe(200);
      expect(summary.body).toEqual({ total: 0, open: 0, resolved: 0, resolutionRate: 0, isDemoData: false });

      const wards = await get('by-ward');
      expect(wards.body.wards).toHaveLength(3);
      expect(wards.body.wards.every((ward) => ward.total === 0 && ward.open === 0 && ward.resolved === 0)).toBe(true);
    });
  });

  describe('with a known set of tickets', () => {
    beforeAll(async () => {
      await addTicket({ ward: 0, category: 'FOOTPATH_ENCROACHMENT', status: 'OPEN' });
      await addTicket({ ward: 0, category: 'FOOTPATH_ENCROACHMENT', status: 'CLOSED' });
      await addTicket({ ward: 0, category: 'ROAD_DAMAGE', status: 'PENDING_VERIFICATION' });
      await addTicket({ ward: 1, category: 'ROAD_DAMAGE', status: 'CLOSED' });
      await addTicket({ ward: 1, category: 'FOOTPATH_ENCROACHMENT', status: 'REOPENED' });
    });

    it('counts total, open, resolved and the resolution rate', async () => {
      const { body } = await get('summary');
      expect(body).toMatchObject({ total: 5, open: 3, resolved: 2, resolutionRate: 40, isDemoData: false });
      expect(Object.values(body).filter((value) => typeof value !== 'boolean').every(isNumber)).toBe(true);
    });

    it('rounds the resolution rate to one decimal', async () => {
      await addTicket({ ward: 2, category: 'GARBAGE_DUMPING', status: 'OPEN' });
      const { body } = await get('summary');
      expect(body).toMatchObject({ total: 6, resolved: 2, resolutionRate: 33.3 });
    });

    it('counts per ward and shows a ward with only one ticket type or none', async () => {
      const { body } = await get('by-ward');
      const byName = Object.fromEntries(body.wards.map((ward) => [ward.ward, ward]));
      expect(body.wards.map((ward) => ward.ward)).toEqual(['Sample Ward A', 'Sample Ward B', 'Sample Ward C']);
      expect(byName['Sample Ward A']).toMatchObject({ total: 3, open: 2, resolved: 1 });
      expect(byName['Sample Ward B']).toMatchObject({ total: 2, open: 1, resolved: 1 });
      expect(byName['Sample Ward C']).toMatchObject({ total: 1, open: 1, resolved: 0 });
      expect(body.wards.flatMap((ward) => [ward.total, ward.open, ward.resolved]).every(isNumber)).toBe(true);
    });

    it('counts per category, always listing all three reportable ones', async () => {
      const { body } = await get('by-category');
      const byCode = Object.fromEntries(body.categories.map((category) => [category.code, category]));
      expect(body.categories.map((category) => category.code)).toEqual(
        ['FOOTPATH_ENCROACHMENT', 'ROAD_DAMAGE', 'GARBAGE_DUMPING']
      );
      expect(byCode.FOOTPATH_ENCROACHMENT).toMatchObject({ name: 'Footpath Encroachment', total: 3, open: 2, resolved: 1 });
      expect(byCode.ROAD_DAMAGE).toMatchObject({ total: 2, open: 1, resolved: 1 });
      expect(byCode.GARBAGE_DUMPING).toMatchObject({ total: 1, open: 1, resolved: 0 });
      expect(body.categories.flatMap((category) => [category.total, category.open, category.resolved]).every(isNumber)).toBe(true);
    });

    it('shows a category with no tickets as 0, and hides non-reportable categories', async () => {
      await db.query("INSERT INTO categories (code, name, reportable) VALUES ('HIDDEN', 'Hidden', FALSE)");
      await db.query('DELETE FROM tickets WHERE category_id = $1', [categoryIds.GARBAGE_DUMPING]);
      const { body } = await get('by-category');

      expect(body.categories.map((category) => category.code)).not.toContain('HIDDEN');
      expect(body.categories.find((category) => category.code === 'GARBAGE_DUMPING')).toMatchObject({ total: 0, open: 0, resolved: 0 });
    });

    it('sets isDemoData when any demo ticket exists', async () => {
      await addTicket({ ward: 0, category: 'ROAD_DAMAGE', status: 'OPEN', isDemo: true });
      expect((await get('summary')).body.isDemoData).toBe(true);
    });
  });

  describe('public access and privacy', () => {
    it.each(['summary', 'by-ward', 'by-category'])('%s needs no login', async (path) => {
      expect((await get(path)).status).toBe(200);
    });

    it('exposes no names, photos or ticket codes', async () => {
      const bodies = await Promise.all(['summary', 'by-ward', 'by-category'].map(async (path) => JSON.stringify((await get(path)).body)));
      const combined = bodies.join('');

      for (const forbidden of ['publicCode', 'public_code', 'photo', 'storage', 'full_name', 'Verifier', 'description']) {
        expect(combined).not.toContain(forbidden);
      }
    });
  });
});
