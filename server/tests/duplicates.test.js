import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { createRequireAuth } from '../src/middleware/requireAuth.js';
import { createLocationRateLimit, createReportRateLimit } from '../src/middleware/rateLimit.js';
import { requireRole } from '../src/middleware/requireRole.js';
import { createDuplicateRouter } from '../src/modules/tickets/duplicate.routes.js';
import { createDuplicateService, maxNearbyResults } from '../src/modules/tickets/duplicate.service.js';
import { createTicketRouter } from '../src/modules/tickets/ticket.routes.js';
import { createTicketService } from '../src/modules/tickets/ticket.service.js';
import { createTestDatabase } from './setup/testDatabase.js';

const baseLat = 12.972;
const baseLng = 77.593;
const metersPerLatDegree = 111_195;
const radiusMeters = 50;
const windowDays = 30;
const northOf = (meters) => baseLat + meters / metersPerLatDegree;
const bearer = (token) => ({ Authorization: `Bearer ${token}` });
const media = { createSignedUrl: async (storagePath) => `https://signed.example.test/${storagePath}` };

describe('duplicate check and support', () => {
  let db;
  let app;
  let categoryIds;
  let verifierId;
  let officerId;

  function buildApp({ radius = radiusMeters, supportLimit = 100 } = {}) {
    const requireAuth = createRequireAuth({
      auth: {
        getUser: async (token) => token === 'o'
          ? { data: { user: { id: officerId } }, error: null }
          : { data: { user: null }, error: new Error('invalid') }
      },
      db
    });

    return createApp({
      db,
      duplicateRouter: createDuplicateRouter({
        duplicateService: createDuplicateService({ db, radiusMeters: radius, windowDays }),
        nearbyRateLimit: createLocationRateLimit(),
        supportRateLimit: createReportRateLimit({ maxRequests: supportLimit })
      }),
      ticketRouter: createTicketRouter({
        requireAuth,
        requireOfficer: requireRole('OFFICER'),
        ticketService: createTicketService({ db, mediaService: media }),
        actionReportService: {},
        photosUpload: (req, res, next) => next()
      }),
      frontendDist: '/tmp/gba-civic-tracker-no-build'
    });
  }

  beforeAll(async () => {
    db = await createTestDatabase();
    [officerId, verifierId] = [randomUUID(), randomUUID()];
    await db.query('INSERT INTO auth.users (id) VALUES ($1), ($2)', [officerId, verifierId]);
    await db.query(
      `INSERT INTO staff (id, full_name, role, ward_id) VALUES
       ($1, 'Officer A', 'OFFICER', 1), ($2, 'Verifier', 'VERIFIER', NULL)`,
      [officerId, verifierId]
    );
    categoryIds = Object.fromEntries((await db.query('SELECT id, code FROM categories')).rows.map((row) => [row.code, row.id]));
    app = buildApp();
  });

  beforeEach(async () => { await db.query('DELETE FROM tickets'); });

  afterAll(async () => { if (db) await db.close(); });

  async function addTicket({ meters = 0, category = 'FOOTPATH_ENCROACHMENT', status = 'OPEN', ageDays = 0 } = {}) {
    const result = await db.query(
      `INSERT INTO tickets (public_code, category_id, description, lat, lng, ward_id, status, created_at,
                            closed_by, closed_at, support_count)
       VALUES ($1, $2, 'private description', $3, $4, 1, $5::varchar,
               now() - ($6::int * interval '1 day'),
               CASE WHEN $5::varchar = 'CLOSED' THEN $7::uuid END,
               CASE WHEN $5::varchar = 'CLOSED' THEN now() END, 1)
       RETURNING id, public_code`,
      [randomUUID().slice(0, 12), categoryIds[category], northOf(meters), baseLng, status, ageDays, verifierId]
    );
    return { id: result.rows[0].id, code: result.rows[0].public_code };
  }

  async function nearby(params = {}, testApp = app) {
    const query = new URLSearchParams({ lat: String(baseLat), lng: String(baseLng), category: 'FOOTPATH_ENCROACHMENT', ...params });
    return request(testApp).get(`/api/reports/nearby?${query}`);
  }

  const codesOf = (response) => response.body.tickets.map((ticket) => ticket.publicCode);
  const supportCount = async (id) => (await db.query('SELECT support_count FROM tickets WHERE id = $1', [id])).rows[0].support_count;
  const ticketTotal = async () => (await db.query('SELECT count(*)::int AS n FROM tickets')).rows[0].n;

  describe('GET /api/reports/nearby', () => {
    it('finds an open ticket 17 m away and not one 1 km away', async () => {
      const close = await addTicket({ meters: 17 });
      const far = await addTicket({ meters: 1000 });
      const response = await nearby();

      expect(response.status).toBe(200);
      expect(codesOf(response)).toContain(close.code);
      expect(codesOf(response)).not.toContain(far.code);
      expect(response.body.tickets.find((ticket) => ticket.publicCode === close.code).distanceMeters).toBe(17);
    });

    it('respects the radius edge', async () => {
      const inside = await addTicket({ meters: 45, category: 'GARBAGE_DUMPING' });
      const outside = await addTicket({ meters: 60, category: 'GARBAGE_DUMPING' });
      const response = await nearby({ category: 'GARBAGE_DUMPING' });

      expect(codesOf(response)).toContain(inside.code);
      expect(codesOf(response)).not.toContain(outside.code);
    });

    it('uses the configured radius', async () => {
      const ticket = await addTicket({ meters: 17, category: 'ROAD_DAMAGE' });
      const tight = buildApp({ radius: 10 });

      expect(codesOf(await nearby({ category: 'ROAD_DAMAGE' }))).toContain(ticket.code);
      expect(codesOf(await nearby({ category: 'ROAD_DAMAGE' }, tight))).not.toContain(ticket.code);
    });

    it('ignores another category', async () => {
      const other = await addTicket({ meters: 5, category: 'ROAD_DAMAGE' });
      expect(codesOf(await nearby({ category: 'GARBAGE_DUMPING' }))).not.toContain(other.code);
    });

    it.each(['CLOSED', 'REJECTED'])('ignores a %s ticket', async (status) => {
      const done = await addTicket({ meters: 5, status });
      expect(codesOf(await nearby())).not.toContain(done.code);
    });

    it.each(['SUBMITTED', 'OPEN', 'IN_PROGRESS', 'PENDING_VERIFICATION', 'REOPENED'])('includes a %s ticket', async (status) => {
      const active = await addTicket({ meters: 5, status });
      expect(codesOf(await nearby())).toContain(active.code);
    });

    it('ignores a ticket older than the window and includes one just inside it', async () => {
      const old = await addTicket({ meters: 5, ageDays: windowDays + 1 });
      const recent = await addTicket({ meters: 5, ageDays: windowDays - 1 });
      const response = await nearby();

      expect(codesOf(response)).not.toContain(old.code);
      expect(codesOf(response)).toContain(recent.code);
    });

    it('returns the nearest first, at most 3, with only public fields', async () => {
      const tickets = [await addTicket({ meters: 30, category: 'GARBAGE_DUMPING' }), await addTicket({ meters: 10, category: 'GARBAGE_DUMPING' }),
        await addTicket({ meters: 20, category: 'GARBAGE_DUMPING' }), await addTicket({ meters: 40, category: 'GARBAGE_DUMPING' })];
      const response = await nearby({ category: 'GARBAGE_DUMPING' });

      expect(response.body.tickets).toHaveLength(maxNearbyResults);
      expect(codesOf(response)).toEqual([tickets[1].code, tickets[2].code, tickets[0].code]);
      expect(Object.keys(response.body.tickets[0]).sort()).toEqual([
        'area', 'categoryName', 'createdAt', 'distanceMeters', 'publicCode', 'status', 'street', 'supportCount', 'wardName'
      ]);
      expect(JSON.stringify(response.body)).not.toContain('private description');
    });

    it('is not swallowed by the public status route', async () => {
      const response = await nearby();
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('tickets');
    });

    it.each([
      ['missing category', { category: '' }],
      ['missing latitude', { lat: '' }],
      ['latitude 999', { lat: '999' }],
      ['longitude 999', { lng: '999' }],
      ['non-numeric latitude', { lat: 'abc' }]
    ])('refuses %s with 400 in the standard shape', async (name, params) => {
      const response = await nearby(params);

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({ status: 400, code: 'INVALID_NEARBY_QUERY' });
    });

    it('refuses a request with no category parameter at all', async () => {
      const response = await request(app).get(`/api/reports/nearby?lat=${baseLat}&lng=${baseLng}`);
      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/reports/:publicCode/support', () => {
    it('adds exactly 1 each time and creates no ticket', async () => {
      const ticket = await addTicket();
      const totalBefore = await ticketTotal();

      const first = await request(app).post(`/api/reports/${ticket.code}/support`);
      expect(first.status).toBe(200);
      expect(first.body).toEqual({ publicCode: ticket.code, supportCount: 2 });
      expect((await request(app).post(`/api/reports/${ticket.code}/support`)).body.supportCount).toBe(3);
      expect(await supportCount(ticket.id)).toBe(3);
      expect(await ticketTotal()).toBe(totalBefore);
    });

    it('counts concurrent supports without losing any', async () => {
      const ticket = await addTicket();
      await Promise.all(Array.from({ length: 5 }, () => request(app).post(`/api/reports/${ticket.code}/support`)));
      expect(await supportCount(ticket.id)).toBe(6);
    });

    it('returns 404 for an unknown code and 400 for a code that is too long', async () => {
      const unknown = await request(app).post('/api/reports/NOSUCHCODE/support');
      expect(unknown.status).toBe(404);
      expect(unknown.body).toMatchObject({ status: 404, code: 'TICKET_NOT_FOUND' });
      expect((await request(app).post(`/api/reports/${'x'.repeat(201)}/support`)).status).toBe(400);
    });

    it.each(['CLOSED', 'REJECTED'])('refuses a %s ticket with 409 and leaves the count', async (status) => {
      const ticket = await addTicket({ status });
      const response = await request(app).post(`/api/reports/${ticket.code}/support`);

      expect(response.status).toBe(409);
      expect(response.body.code).toBe('TICKET_NOT_OPEN');
      expect(await supportCount(ticket.id)).toBe(1);
    });

    it('is rate limited', async () => {
      const limited = buildApp({ supportLimit: 2 });
      const ticket = await addTicket();
      const statuses = [];

      for (let attempt = 0; attempt < 3; attempt += 1) {
        statuses.push((await request(limited).post(`/api/reports/${ticket.code}/support`)).status);
      }

      expect(statuses).toEqual([200, 200, 429]);
      expect(await supportCount(ticket.id)).toBe(3);
    });
  });

  describe('support count on other screens', () => {
    it('shows in the public status and the officer detail', async () => {
      const ticket = await addTicket();
      await request(app).post(`/api/reports/${ticket.code}/support`);

      const publicStatus = await request(app).get(`/api/reports/${ticket.code}`);
      expect(publicStatus.status).toBe(200);
      expect(publicStatus.body.supportCount).toBe(2);

      const detail = await request(app).get(`/api/tickets/${ticket.id}`).set(bearer('o'));
      expect(detail.status).toBe(200);
      expect(detail.body.supportCount).toBe(2);
    });
  });
});
