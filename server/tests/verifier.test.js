import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/application.js';
import { createRequireAuth } from '../src/middleware/requireAuth.js';
import { requireRole } from '../src/middleware/requireRole.js';
import { createVerifierRouter, reasonMaxLength } from '../src/modules/verifier/verifier.routes.js';
import { createVerifierService } from '../src/modules/verifier/verifier.service.js';
import { createTicketRouter } from '../src/modules/tickets/ticket.routes.js';
import { createTicketService } from '../src/modules/tickets/ticket.service.js';
import { createTestDatabase } from './setup/testDatabase.js';

const bearer = (token) => ({ Authorization: `Bearer ${token}` });
const ticketLat = 12.972;
const ticketLng = 77.593;
const media = { createSignedUrl: async (storagePath) => `https://signed.example.test/${storagePath}` };

describe('verifier queue, compare, approve and reject', () => {
  let db;
  let app;
  let strictApp;
  let categoryId;
  let officerId;
  let verifierId;

  function buildApp(farWarningMeters) {
    const users = new Map([['o', officerId], ['v', verifierId], ['gone', inactiveId]]);
    const requireAuth = createRequireAuth({
      auth: {
        getUser: async (token) => users.has(token)
          ? { data: { user: { id: users.get(token) } }, error: null }
          : { data: { user: null }, error: new Error('invalid') }
      },
      db
    });

    return createApp({
      db,
      ticketRouter: createTicketRouter({
        requireAuth,
        requireOfficer: requireRole('OFFICER'),
        ticketService: createTicketService({ db, mediaService: media }),
        actionReportService: {},
        photosUpload: (request, response, next) => next()
      }),
      verifierRouter: createVerifierRouter({
        requireAuth,
        requireVerifier: requireRole('VERIFIER'),
        verifierService: createVerifierService({ db, mediaService: media, farWarningMeters })
      }),
      frontendDist: '/tmp/gba-civic-tracker-no-build'
    });
  }

  let inactiveId;

  beforeAll(async () => {
    db = await createTestDatabase();
    [officerId, verifierId, inactiveId] = [randomUUID(), randomUUID(), randomUUID()];
    await db.query('INSERT INTO auth.users (id) VALUES ($1), ($2), ($3)', [officerId, verifierId, inactiveId]);
    await db.query(
      `INSERT INTO staff (id, full_name, role, ward_id, active) VALUES
       ($1, 'Officer A', 'OFFICER', 1, TRUE),
       ($2, 'Verifier', 'VERIFIER', NULL, TRUE),
       ($3, 'Gone Verifier', 'VERIFIER', NULL, FALSE)`,
      [officerId, verifierId, inactiveId]
    );
    categoryId = (await db.query("SELECT id FROM categories WHERE code = 'ROAD_DAMAGE'")).rows[0].id;
    app = buildApp(50);
    strictApp = buildApp(10);
  });

  afterAll(async () => { if (db) await db.close(); });

  async function createTicket(status) {
    const result = await db.query(
      `INSERT INTO tickets (public_code, category_id, description, lat, lng, ward_id, status, assigned_officer_id,
                            closed_by, closed_at)
       VALUES ($1, $2, 'test', $3, $4, 1, $5::varchar, $6,
               CASE WHEN $5::varchar = 'CLOSED' THEN $7::uuid END,
               CASE WHEN $5::varchar = 'CLOSED' THEN now() END)
       RETURNING id`,
      [randomUUID().slice(0, 12), categoryId, ticketLat, ticketLng, status, officerId, verifierId]
    );
    await db.query(
      `INSERT INTO media (ticket_id, type, storage_path, content_type, size_bytes)
       VALUES ($1, 'ORIGINAL', $2, 'image/jpeg', 10)`,
      [result.rows[0].id, `tickets/${result.rows[0].id}/original.jpg`]
    );
    return result.rows[0].id;
  }

  async function addReport(ticketId, { lat = ticketLat, lng = ticketLng, photos = 1 } = {}) {
    const report = await db.query(
      `INSERT INTO action_reports (ticket_id, officer_id, remarks, lat, lng)
       VALUES ($1, $2, 'Fixed it', $3, $4) RETURNING id`,
      [ticketId, officerId, lat, lng]
    );

    for (let index = 0; index < photos; index += 1) {
      await db.query(
        `INSERT INTO media (ticket_id, action_report_id, type, storage_path, content_type, size_bytes)
         VALUES ($1, $2, 'ACTION', $3, 'image/jpeg', 10)`,
        [ticketId, report.rows[0].id, `tickets/${ticketId}/action-${report.rows[0].id}-${index}.jpg`]
      );
    }

    return report.rows[0].id;
  }

  async function createPending(reportOptions) {
    const ticketId = await createTicket('PENDING_VERIFICATION');
    const reportId = await addReport(ticketId, reportOptions);
    return { ticketId, reportId };
  }

  async function ticketState(ticketId) {
    const ticket = await db.query('SELECT status, closed_by, closed_at FROM tickets WHERE id = $1', [ticketId]);
    const history = await db.query(
      'SELECT from_status, to_status, changed_by, reason FROM status_history WHERE ticket_id = $1 ORDER BY id',
      [ticketId]
    );
    return { ticket: ticket.rows[0], history: history.rows };
  }

  const approve = (ticketId, token = 'v') => request(app).post(`/api/tickets/${ticketId}/approve`).set(bearer(token));
  const reject = (ticketId, body, token = 'v') => request(app).post(`/api/tickets/${ticketId}/reject`).set(bearer(token)).send(body);

  describe('queue', () => {
    it('lists pending tickets from all wards and nothing else', async () => {
      const { ticketId } = await createPending();
      const openId = await createTicket('OPEN');
      const response = await request(app).get('/api/verifier/tickets?status=PENDING_VERIFICATION').set(bearer('v'));

      expect(response.status).toBe(200);
      const ids = response.body.tickets.map((ticket) => ticket.ticketId);
      expect(ids).toContain(ticketId);
      expect(ids).not.toContain(openId);
      expect(response.body.tickets.every((ticket) => ticket.status === 'PENDING_VERIFICATION')).toBe(true);
      expect(typeof response.body.total).toBe('number');
    });

    it('refuses other statuses with 400', async () => {
      const response = await request(app).get('/api/verifier/tickets?status=CLOSED').set(bearer('v'));
      expect(response.status).toBe(400);
      expect(response.body.code).toBe('INVALID_TICKET_FILTER');
    });
  });

  describe('compare', () => {
    it('returns both photos, times, places and the distance', async () => {
      const { ticketId, reportId } = await createPending({ lat: ticketLat + 0.0002 });
      const response = await request(app).get(`/api/tickets/${ticketId}/compare`).set(bearer('v'));

      expect(response.status).toBe(200);
      expect(response.body.original).toMatchObject({ lat: ticketLat, lng: ticketLng });
      expect(response.body.original.url).toMatch(/^https:\/\/signed\.example\.test\//);
      expect(response.body.action.actionReportId).toBe(reportId);
      expect(response.body.action.photos).toHaveLength(1);
      expect(response.body.distanceMeters).toBeGreaterThan(21);
      expect(response.body.distanceMeters).toBeLessThan(23);
      expect(response.body.farWarning).toBe(false);
    });

    it('sets farWarning when the distance is above the setting', async () => {
      const { ticketId } = await createPending({ lat: ticketLat + 0.001 });
      const far = await request(app).get(`/api/tickets/${ticketId}/compare`).set(bearer('v'));

      expect(far.body.distanceMeters).toBeGreaterThan(100);
      expect(far.body.farWarning).toBe(true);
    });

    it('switches farWarning at the configured limit', async () => {
      const { ticketId } = await createPending({ lat: ticketLat + 0.0002 });
      const strict = await request(strictApp).get(`/api/tickets/${ticketId}/compare`).set(bearer('v'));

      expect(strict.body.farWarning).toBe(true);
    });

    it.each(['OPEN', 'IN_PROGRESS', 'REOPENED', 'CLOSED'])('refuses a %s ticket with 409', async (status) => {
      const ticketId = await createTicket(status);
      const response = await request(app).get(`/api/tickets/${ticketId}/compare`).set(bearer('v'));
      expect(response.status).toBe(409);
    });

    it('returns 404 for a missing ticket and 400 for a bad id', async () => {
      expect((await request(app).get('/api/tickets/999999/compare').set(bearer('v'))).status).toBe(404);
      expect((await request(app).get('/api/tickets/abc/compare').set(bearer('v'))).status).toBe(400);
    });
  });

  describe('approve', () => {
    it('closes a waiting ticket and records the verifier, history and decision', async () => {
      const { ticketId, reportId } = await createPending();
      const response = await approve(ticketId);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('CLOSED');
      const state = await ticketState(ticketId);
      expect(state.ticket).toMatchObject({ status: 'CLOSED', closed_by: verifierId });
      expect(state.ticket.closed_at).not.toBeNull();
      expect(state.history).toEqual([
        { from_status: 'PENDING_VERIFICATION', to_status: 'CLOSED', changed_by: verifierId, reason: null }
      ]);
      const report = await db.query('SELECT decision, decided_by FROM action_reports WHERE id = $1', [reportId]);
      expect(report.rows[0]).toEqual({ decision: 'APPROVED', decided_by: verifierId });
    });

    it('refuses a waiting ticket that has no action report, with 409', async () => {
      const ticketId = await createTicket('PENDING_VERIFICATION');
      const response = await approve(ticketId);

      expect(response.status).toBe(409);
      expect((await ticketState(ticketId)).ticket.status).toBe('PENDING_VERIFICATION');
    });

    it('refuses an action report with no photo, with 409', async () => {
      const ticketId = await createTicket('PENDING_VERIFICATION');
      await addReport(ticketId, { photos: 0 });
      const response = await approve(ticketId);

      expect(response.status).toBe(409);
      expect((await ticketState(ticketId)).ticket.status).toBe('PENDING_VERIFICATION');
    });

    it.each(['OPEN', 'IN_PROGRESS', 'REOPENED', 'CLOSED'])('refuses a %s ticket with 409', async (status) => {
      const ticketId = await createTicket(status);
      await addReport(ticketId);
      const response = await approve(ticketId);

      expect(response.status).toBe(409);
      expect((await ticketState(ticketId)).ticket.status).toBe(status);
    });

    it('refuses a second approval with 409 and keeps one history row', async () => {
      const { ticketId } = await createPending();
      const [first, second] = await Promise.all([approve(ticketId), approve(ticketId)]);

      expect([first.status, second.status].sort()).toEqual([200, 409]);
      expect((await ticketState(ticketId)).history).toHaveLength(1);
    });

    it('refuses an officer (403), a deactivated verifier (403), no login (401) and a missing ticket (404)', async () => {
      const { ticketId } = await createPending();

      expect((await approve(ticketId, 'o')).status).toBe(403);
      expect((await approve(ticketId, 'gone')).status).toBe(403);
      expect((await approve(ticketId, 'nobody')).status).toBe(401);
      expect((await approve(999999)).status).toBe(404);
      expect((await ticketState(ticketId)).ticket.status).toBe('PENDING_VERIFICATION');
    });
  });

  describe('reject', () => {
    it('reopens the ticket for the same officer and saves the reason', async () => {
      const { ticketId, reportId } = await createPending();
      const response = await reject(ticketId, { reason: '  Photo shows a different spot.  ' });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('REOPENED');
      const state = await ticketState(ticketId);
      expect(state.ticket).toMatchObject({ status: 'REOPENED', closed_by: null, closed_at: null });
      expect(state.history).toEqual([
        { from_status: 'PENDING_VERIFICATION', to_status: 'REOPENED', changed_by: verifierId, reason: 'Photo shows a different spot.' }
      ]);
      const report = await db.query(
        'SELECT decision, decided_by, decision_reason FROM action_reports WHERE id = $1',
        [reportId]
      );
      expect(report.rows[0]).toEqual({ decision: 'REJECTED', decided_by: verifierId, decision_reason: 'Photo shows a different spot.' });
      const ticket = await db.query('SELECT assigned_officer_id FROM tickets WHERE id = $1', [ticketId]);
      expect(ticket.rows[0].assigned_officer_id).toBe(officerId);
    });

    it.each([
      ['a missing reason', {}],
      ['an empty reason', { reason: '   ' }],
      ['a reason over the limit', { reason: 'x'.repeat(reasonMaxLength + 1) }]
    ])('refuses %s with 400 and changes nothing', async (name, body) => {
      const { ticketId } = await createPending();
      const response = await reject(ticketId, body);

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('INVALID_REASON');
      const state = await ticketState(ticketId);
      expect(state.ticket.status).toBe('PENDING_VERIFICATION');
      expect(state.history).toHaveLength(0);
    });

    it('refuses a ticket that is not waiting with 409', async () => {
      const ticketId = await createTicket('IN_PROGRESS');
      expect((await reject(ticketId, { reason: 'No' })).status).toBe(409);
    });

    it('refuses an officer (403) and a deactivated verifier (403)', async () => {
      const { ticketId } = await createPending();

      expect((await reject(ticketId, { reason: 'No' }, 'o')).status).toBe(403);
      expect((await reject(ticketId, { reason: 'No' }, 'gone')).status).toBe(403);
      expect((await ticketState(ticketId)).ticket.status).toBe('PENDING_VERIFICATION');
    });

    it('supports reject, a new report, then approve', async () => {
      const { ticketId, reportId } = await createPending();
      await reject(ticketId, { reason: 'Not fixed.' });
      await db.query("UPDATE tickets SET status = 'PENDING_VERIFICATION' WHERE id = $1", [ticketId]);
      const secondReportId = await addReport(ticketId);

      const compare = await request(app).get(`/api/tickets/${ticketId}/compare`).set(bearer('v'));
      expect(compare.body.action.actionReportId).toBe(secondReportId);
      expect((await approve(ticketId)).status).toBe(200);
      const decisions = await db.query('SELECT id, decision FROM action_reports WHERE ticket_id = $1 ORDER BY id', [ticketId]);
      expect(decisions.rows).toEqual([
        { id: reportId, decision: 'REJECTED' },
        { id: secondReportId, decision: 'APPROVED' }
      ]);
    });
  });

  describe('officer view after a rejection', () => {
    it('shows the reason in the timeline and the decision on the report', async () => {
      const { ticketId } = await createPending();
      await reject(ticketId, { reason: 'Photo is blurry.' });
      const response = await request(app).get(`/api/tickets/${ticketId}`).set(bearer('o'));

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('REOPENED');
      expect(response.body.timeline.at(-1)).toMatchObject({ toStatus: 'REOPENED', reason: 'Photo is blurry.' });
      expect(response.body.actionReports[0]).toMatchObject({ decision: 'REJECTED', decisionReason: 'Photo is blurry.' });
    });

    it('keeps reasons out of the public status lookup', async () => {
      const { ticketId } = await createPending();
      await reject(ticketId, { reason: 'Private note.' });
      const code = (await db.query('SELECT public_code FROM tickets WHERE id = $1', [ticketId])).rows[0].public_code;
      const response = await request(app).get(`/api/reports/${code}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('REOPENED');
      expect(JSON.stringify(response.body)).not.toContain('Private note.');
    });
  });

  describe('no direct status route', () => {
    it.each([
      ['patch', '/api/tickets/1/status'],
      ['put', '/api/tickets/1/status'],
      ['post', '/api/tickets/1/status'],
      ['post', '/api/tickets/1/close']
    ])('%s %s does not exist', async (method, path) => {
      const response = await request(app)[method](path).set(bearer('v')).send({ status: 'CLOSED' });
      expect(response.status).toBe(404);
    });
  });
});
