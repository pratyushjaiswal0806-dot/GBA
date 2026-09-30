import { randomUUID } from 'node:crypto';
import request from 'supertest';
import sharp from 'sharp';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/application.js';
import { createPhotosUpload } from '../src/middleware/upload.js';
import { createRequireAuth } from '../src/middleware/requireAuth.js';
import { requireRole } from '../src/middleware/requireRole.js';
import { createActionReportService } from '../src/modules/actionReports/actionReport.service.js';
import { cleanPhoto } from '../src/modules/media/media.service.js';
import { createTicketRouter } from '../src/modules/tickets/ticket.routes.js';
import { createTicketService } from '../src/modules/tickets/ticket.service.js';
import { createTestDatabase } from './setup/testDatabase.js';

const bearer = (token) => ({ Authorization: `Bearer ${token}` });
const maxUploadMb = 1;

function createFakeMediaService() {
  const stored = new Set();
  return {
    stored,
    clean: cleanPhoto,
    uploadPhoto: async ({ ticketId, photo }) => {
      const storagePath = `tickets/${ticketId}/${randomUUID()}.jpg`;
      stored.add(storagePath);
      return { ...photo, storagePath };
    },
    remove: async (storagePath) => { stored.delete(storagePath); },
    createSignedUrl: async (storagePath) => `https://signed.example.test/${storagePath}`
  };
}

describe('POST /api/tickets/:id/action-report', () => {
  let db;
  let app;
  let media;
  let jpeg;
  let categoryId;
  let officerAId;
  let officerBId;
  let verifierId;

  beforeAll(async () => {
    db = await createTestDatabase();
    [officerAId, officerBId, verifierId] = [randomUUID(), randomUUID(), randomUUID()];
    await db.query('INSERT INTO auth.users (id) VALUES ($1), ($2), ($3)', [officerAId, officerBId, verifierId]);
    await db.query(
      `INSERT INTO staff (id, full_name, role, ward_id) VALUES
       ($1, 'Officer A', 'OFFICER', 1), ($2, 'Officer B', 'OFFICER', 2), ($3, 'Verifier', 'VERIFIER', NULL)`,
      [officerAId, officerBId, verifierId]
    );
    categoryId = (await db.query("SELECT id FROM categories WHERE code = 'FOOTPATH_ENCROACHMENT'")).rows[0].id;
    jpeg = await sharp({ create: { width: 40, height: 20, channels: 3, background: '#888' } }).jpeg().toBuffer();

    const users = new Map([['a', officerAId], ['b', officerBId], ['v', verifierId]]);
    const requireAuth = createRequireAuth({
      auth: {
        getUser: async (token) => users.has(token)
          ? { data: { user: { id: users.get(token) } }, error: null }
          : { data: { user: null }, error: new Error('invalid') }
      },
      db
    });
    media = createFakeMediaService();
    app = createApp({
      db,
      ticketRouter: createTicketRouter({
        requireAuth,
        requireOfficer: requireRole('OFFICER'),
        ticketService: createTicketService({ db, mediaService: media }),
        actionReportService: createActionReportService({ db, mediaService: media }),
        photosUpload: createPhotosUpload({ maxUploadMb })
      }),
      frontendDist: '/tmp/gba-civic-tracker-no-build'
    });
  });

  beforeEach(() => { media.stored.clear(); });
  afterAll(async () => { if (db) await db.close(); });

  async function createTicket(status = 'IN_PROGRESS', wardId = 1) {
    const result = await db.query(
      `INSERT INTO tickets (public_code, category_id, description, lat, lng, ward_id, status, assigned_officer_id)
       VALUES ($1, $2, 'test', 12.972, 77.593, $3, $4, $5) RETURNING id`,
      [randomUUID().slice(0, 12), categoryId, wardId, status, wardId === 1 ? officerAId : officerBId]
    );
    return result.rows[0].id;
  }

  function submit(ticketId, { token = 'a', remarks = 'Removed it', photos = [jpeg], lat = '12.972', lng = '77.593' } = {}) {
    const req = request(app).post(`/api/tickets/${ticketId}/action-report`).set(bearer(token));
    if (remarks !== null) req.field('remarks', remarks);
    if (lat !== null) req.field('lat', lat);
    if (lng !== null) req.field('lng', lng);
    photos.forEach((photo, index) => req.attach('photos', photo, `p${index}.jpg`));
    return req;
  }

  async function expectUnchanged(ticketId, status) {
    const ticket = await db.query('SELECT status FROM tickets WHERE id = $1', [ticketId]);
    const reports = await db.query('SELECT count(*)::int AS n FROM action_reports WHERE ticket_id = $1', [ticketId]);
    const history = await db.query('SELECT count(*)::int AS n FROM status_history WHERE ticket_id = $1', [ticketId]);
    expect(ticket.rows[0].status).toBe(status);
    expect(reports.rows[0].n).toBe(0);
    expect(history.rows[0].n).toBe(0);
    expect(media.stored.size).toBe(0);
  }

  it.each([1, 3])('accepts %i photos, saves rows and moves to pending verification', async (count) => {
    const ticketId = await createTicket();
    const response = await submit(ticketId, { photos: Array(count).fill(jpeg) });

    expect(response.status).toBe(201);
    expect(response.body.status).toBe('PENDING_VERIFICATION');
    const ticket = await db.query('SELECT status, closed_at FROM tickets WHERE id = $1', [ticketId]);
    expect(ticket.rows[0]).toMatchObject({ status: 'PENDING_VERIFICATION', closed_at: null });
    const rows = await db.query("SELECT action_report_id, lat FROM media WHERE ticket_id = $1 AND type = 'ACTION'", [ticketId]);
    expect(rows.rows).toHaveLength(count);
    expect(rows.rows[0].action_report_id).toBe(response.body.actionReportId);
    const history = await db.query('SELECT from_status, to_status, changed_by FROM status_history WHERE ticket_id = $1', [ticketId]);
    expect(history.rows).toEqual([{ from_status: 'IN_PROGRESS', to_status: 'PENDING_VERIFICATION', changed_by: officerAId }]);
  });

  it.each(['OPEN', 'REOPENED'])('works from %s without starting first', async (status) => {
    const response = await submit(await createTicket(status));
    expect(response.status).toBe(201);
  });

  it('stores photos as cleaned JPEGs and shows the report in the ticket detail', async () => {
    const ticketId = await createTicket();
    await submit(ticketId);
    const detail = await request(app).get(`/api/tickets/${ticketId}`).set(bearer('a'));

    expect(detail.status).toBe(200);
    expect(detail.body.actionReports).toHaveLength(1);
    expect(detail.body.actionReports[0]).toMatchObject({ remarks: 'Removed it', officerName: 'Officer A' });
    expect(detail.body.actionReports[0].photos[0].url).toMatch(/^https:\/\/signed\.example\.test\/tickets\//);
    const saved = await db.query("SELECT content_type FROM media WHERE ticket_id = $1 AND type = 'ACTION'", [ticketId]);
    expect(saved.rows[0].content_type).toBe('image/jpeg');
  });

  it.each([
    ['empty remarks', { remarks: '   ' }, 400],
    ['missing remarks', { remarks: null }, 400],
    ['too-long remarks', { remarks: 'x'.repeat(501) }, 400],
    ['missing location', { lat: null }, 400],
    ['bad latitude', { lat: '999' }, 400],
    ['no photo', { photos: [] }, 400]
  ])('refuses %s and changes nothing', async (name, options, status) => {
    const ticketId = await createTicket();
    const response = await submit(ticketId, options);
    expect(response.status).toBe(status);
    await expectUnchanged(ticketId, 'IN_PROGRESS');
  });

  it('refuses 4 photos', async () => {
    const ticketId = await createTicket();
    const response = await submit(ticketId, { photos: Array(4).fill(jpeg) });
    expect(response.status).toBe(400);
    await expectUnchanged(ticketId, 'IN_PROGRESS');
  });

  it('refuses a file over the size limit with 413', async () => {
    const ticketId = await createTicket();
    const response = await submit(ticketId, { photos: [Buffer.alloc(maxUploadMb * 1024 * 1024 + 1)] });
    expect(response.status).toBe(413);
    await expectUnchanged(ticketId, 'IN_PROGRESS');
  });

  it('refuses a fake image with 415 and uploads nothing', async () => {
    const ticketId = await createTicket();
    const response = await submit(ticketId, { photos: [jpeg, Buffer.from('not an image')] });
    expect(response.status).toBe(415);
    await expectUnchanged(ticketId, 'IN_PROGRESS');
  });

  it.each(['PENDING_VERIFICATION', 'SUBMITTED'])('refuses status %s with 409 and removes uploaded photos', async (status) => {
    const ticketId = await createTicket(status);
    const response = await submit(ticketId);
    expect(response.status).toBe(409);
    await expectUnchanged(ticketId, status);
  });

  it('refuses a closed ticket with 409', async () => {
    const ticketId = await createTicket();
    await db.query(
      "UPDATE tickets SET status = 'CLOSED', closed_by = $2, closed_at = now() WHERE id = $1",
      [ticketId, verifierId]
    );
    expect((await submit(ticketId)).status).toBe(409);
  });

  it('refuses another ward (403), a verifier (403), no login (401) and a missing ticket (404)', async () => {
    const ticketId = await createTicket();
    expect((await submit(ticketId, { token: 'b' })).status).toBe(403);
    expect((await submit(ticketId, { token: 'v' })).status).toBe(403);
    expect((await submit(ticketId, { token: 'nobody' })).status).toBe(401);
    expect((await submit(999999)).status).toBe(404);
    await expectUnchanged(ticketId, 'IN_PROGRESS');
  });
});
