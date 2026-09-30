import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { createRequireAuth } from '../src/middleware/requireAuth.js';
import { requireRole } from '../src/middleware/requireRole.js';
import { createOfficerRouter } from '../src/modules/officer/officer.routes.js';
import { createOfficerService } from '../src/modules/officer/officer.service.js';
import { createTicketRouter } from '../src/modules/tickets/ticket.routes.js';
import { createTicketService } from '../src/modules/tickets/ticket.service.js';
import { createTestDatabase } from './setup/testDatabase.js';

function bearer(token) {
  return { Authorization: `Bearer ${token}` };
}

describe('ticket detail, start work, and public status', () => {
  let db;
  let app;
  let officerAId;
  let officerBId;
  let openTicketId;
  let wardBTicketId;

  beforeAll(async () => {
    db = await createTestDatabase();
    officerAId = randomUUID();
    officerBId = randomUUID();
    await db.query('INSERT INTO auth.users (id) VALUES ($1), ($2)', [officerAId, officerBId]);
    await db.query(
      `INSERT INTO staff (id, full_name, role, ward_id)
       VALUES ($1, 'Officer A', 'OFFICER', 1), ($2, 'Officer B', 'OFFICER', 2)`,
      [officerAId, officerBId]
    );
    const category = await db.query("SELECT id FROM categories WHERE code = 'FOOTPATH_ENCROACHMENT'");
    const openTicket = await db.query(
      `INSERT INTO tickets (
         public_code, category_id, description, lat, lng, street, area, ward_id, status, assigned_officer_id
       ) VALUES ('TRACKOPEN', $1, 'Ward A ticket', 12.972, 77.593, 'Demo Road', 'Sample Area A', 1, 'OPEN', $2)
       RETURNING id`,
      [category.rows[0].id, officerAId]
    );
    openTicketId = openTicket.rows[0].id;
    const wardBTicket = await db.query(
      `INSERT INTO tickets (
         public_code, category_id, description, lat, lng, ward_id, status, assigned_officer_id
       ) VALUES ('TRACKWARDB', $1, 'Ward B ticket', 12.972, 77.603, 2, 'OPEN', $2)
       RETURNING id`,
      [category.rows[0].id, officerBId]
    );
    wardBTicketId = wardBTicket.rows[0].id;
    await db.query(
      `INSERT INTO media (ticket_id, type, storage_path, content_type, size_bytes)
       VALUES ($1, 'ORIGINAL', 'tickets/test/original.jpg', 'image/jpeg', 10)`,
      [openTicketId]
    );
    await db.query(
      `INSERT INTO status_history (ticket_id, from_status, to_status)
       VALUES ($1, NULL, 'OPEN')`,
      [openTicketId]
    );

    const tokenUsers = new Map([
      ['officer-a-token', officerAId],
      ['officer-b-token', officerBId]
    ]);
    const requireAuth = createRequireAuth({
      auth: {
        getUser: async (token) => {
          const id = tokenUsers.get(token);
          return id
            ? { data: { user: { id } }, error: null }
            : { data: { user: null }, error: new Error('invalid token') };
        }
      },
      db
    });
    const ticketService = createTicketService({
      db,
      mediaService: { createSignedUrl: async (path) => `https://signed.example.test/${path}` }
    });
    app = createApp({
      db,
      officerRouter: createOfficerRouter({
        requireAuth,
        requireOfficer: requireRole('OFFICER'),
        officerService: createOfficerService({ db })
      }),
      ticketRouter: createTicketRouter({
        requireAuth,
        requireOfficer: requireRole('OFFICER'),
        ticketService,
        actionReportService: { submit: async () => ({}) },
        photosUpload: (request, response, next) => next()
      }),
      frontendDist: '/tmp/gba-civic-tracker-no-build'
    });
  });

  afterAll(async () => {
    if (db) await db.close();
  });

  it('returns protected detail with a signed original-photo link and staff timeline', async () => {
    const response = await request(app)
      .get(`/api/tickets/${openTicketId}`)
      .set(bearer('officer-a-token'));

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ticketId: openTicketId,
      publicCode: 'TRACKOPEN',
      description: 'Ward A ticket',
      original: { url: 'https://signed.example.test/tickets/test/original.jpg' }
    });
    expect(response.body.timeline).toHaveLength(1);
  });

  it('starts work once and writes one history row', async () => {
    const first = await request(app)
      .post(`/api/tickets/${openTicketId}/start`)
      .set(bearer('officer-a-token'));
    const second = await request(app)
      .post(`/api/tickets/${openTicketId}/start`)
      .set(bearer('officer-a-token'));
    const history = await db.query(
      `SELECT from_status, to_status, changed_by
       FROM status_history
       WHERE ticket_id = $1
       ORDER BY id`,
      [openTicketId]
    );

    expect(first.body).toEqual({ status: 'IN_PROGRESS' });
    expect(second.body).toMatchObject({ status: 409, code: 'ILLEGAL_TRANSITION' });
    expect(history.rows).toEqual([
      { from_status: null, to_status: 'OPEN', changed_by: null },
      { from_status: 'OPEN', to_status: 'IN_PROGRESS', changed_by: officerAId }
    ]);
  });

  it('refuses another ward and a missing ticket', async () => {
    const otherWardDetail = await request(app)
      .get(`/api/tickets/${wardBTicketId}`)
      .set(bearer('officer-a-token'));
    const otherWardStart = await request(app)
      .post(`/api/tickets/${wardBTicketId}/start`)
      .set(bearer('officer-a-token'));
    const missing = await request(app)
      .get('/api/tickets/99999')
      .set(bearer('officer-a-token'));

    expect(otherWardDetail.body).toMatchObject({ status: 403, code: 'FORBIDDEN' });
    expect(otherWardStart.body).toMatchObject({ status: 403, code: 'FORBIDDEN' });
    expect(missing.body).toMatchObject({ status: 404, code: 'TICKET_NOT_FOUND' });
  });

  it('returns public status without photo links or staff identities', async () => {
    const response = await request(app).get('/api/reports/TRACKOPEN');
    const body = JSON.stringify(response.body);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ publicCode: 'TRACKOPEN', status: 'IN_PROGRESS' });
    expect(body).not.toContain('signed.example.test');
    expect(body).not.toContain('Officer A');
    expect(body).not.toContain('storagePath');

    const missing = await request(app).get('/api/reports/THIS-CODE-DOES-NOT-EXIST');
    expect(missing.body).toMatchObject({ status: 404, code: 'TICKET_NOT_FOUND' });
  });
});
