import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/application.js';
import { createRequireAuth } from '../src/middleware/requireAuth.js';
import { requireRole } from '../src/middleware/requireRole.js';
import { createAuthRouter } from '../src/modules/auth/auth.routes.js';
import { createOfficerRouter } from '../src/modules/officer/officer.routes.js';
import { createOfficerService } from '../src/modules/officer/officer.service.js';
import { createTestDatabase } from './setup/testDatabase.js';

function bearer(token) {
  return { Authorization: `Bearer ${token}` };
}

describe('staff authentication and officer tickets', () => {
  let db;
  let app;
  let officerAId;
  let officerBId;
  let verifierId;
  let inactiveOfficerId;

  beforeAll(async () => {
    db = await createTestDatabase();
    officerAId = randomUUID();
    officerBId = randomUUID();
    verifierId = randomUUID();
    inactiveOfficerId = randomUUID();

    await db.query(
      'INSERT INTO auth.users (id) VALUES ($1), ($2), ($3), ($4)',
      [officerAId, officerBId, verifierId, inactiveOfficerId]
    );
    await db.query(
      `INSERT INTO staff (id, full_name, role, ward_id, active)
       VALUES
         ($1, 'Officer A', 'OFFICER', 1, TRUE),
         ($2, 'Officer B', 'OFFICER', 2, TRUE),
         ($3, 'Verifier', 'VERIFIER', NULL, TRUE),
         ($4, 'Inactive Officer', 'OFFICER', 1, FALSE)`,
      [officerAId, officerBId, verifierId, inactiveOfficerId]
    );

    const categories = await db.query('SELECT id, code FROM categories ORDER BY id');
    await db.query(
      `INSERT INTO tickets (
         public_code, category_id, description, lat, lng, ward_id, assigned_officer_id, status
       ) VALUES
         ('WARDAOPEN', $1, 'Ward A open', 12.972, 77.593, 1, $4, 'OPEN'),
         ('WARDAREOP', $2, 'Ward A reopened', 12.973, 77.594, 1, $4, 'REOPENED'),
         ('WARDBWORK', $3, 'Ward B in progress', 12.972, 77.603, 2, $5, 'IN_PROGRESS')`,
      [categories.rows[0].id, categories.rows[1].id, categories.rows[2].id, officerAId, officerBId]
    );

    const tokenUsers = new Map([
      ['officer-a-token', officerAId],
      ['officer-b-token', officerBId],
      ['verifier-token', verifierId],
      ['inactive-token', inactiveOfficerId]
    ]);
    const auth = {
      getUser: async (token) => {
        const id = tokenUsers.get(token);
        return id
          ? { data: { user: { id } }, error: null }
          : { data: { user: null }, error: new Error('invalid token') };
      }
    };
    const requireAuth = createRequireAuth({ auth, db });
    const officerService = createOfficerService({ db });
    app = createApp({
      db,
      authRouter: createAuthRouter({ requireAuth }),
      officerRouter: createOfficerRouter({
        requireAuth,
        requireOfficer: requireRole('OFFICER'),
        officerService
      }),
      frontendDist: '/tmp/gba-civic-tracker-no-build'
    });
  });

  afterAll(async () => {
    if (db) {
      await db.close();
    }
  });

  it('requires a valid staff token and refuses inactive staff', async () => {
    const missing = await request(app).get('/api/auth/me');
    const invalid = await request(app).get('/api/auth/me').set(bearer('unknown-token'));
    const inactive = await request(app).get('/api/auth/me').set(bearer('inactive-token'));

    expect(missing.body).toMatchObject({ status: 401, code: 'AUTH_REQUIRED' });
    expect(invalid.body).toMatchObject({ status: 401, code: 'INVALID_TOKEN' });
    expect(inactive.body).toMatchObject({ status: 403, code: 'STAFF_INACTIVE' });
  });

  it('returns the active staff profile', async () => {
    const response = await request(app).get('/api/auth/me').set(bearer('officer-a-token'));

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id: officerAId,
      name: 'Officer A',
      role: 'OFFICER',
      wardId: 1,
      wardName: 'Sample Ward A'
    });
  });

  it('limits officer tickets and counts to the officer ward in SQL', async () => {
    const tickets = await request(app)
      .get('/api/officer/tickets')
      .set(bearer('officer-a-token'));
    const counts = await request(app)
      .get('/api/officer/tickets/counts')
      .set(bearer('officer-a-token'));

    expect(tickets.status).toBe(200);
    expect(tickets.body.tickets.map((ticket) => ticket.publicCode)).toEqual(['WARDAREOP', 'WARDAOPEN']);
    expect(tickets.body.total).toBe(2);
    expect(counts.body).toEqual({ open: 1, reopened: 1 });
  });

  it('rejects a verifier and invalid filters from officer routes', async () => {
    const verifier = await request(app)
      .get('/api/officer/tickets')
      .set(bearer('verifier-token'));
    const invalidFilter = await request(app)
      .get('/api/officer/tickets?status=NOT_A_STATUS&page=0')
      .set(bearer('officer-a-token'));

    expect(verifier.body).toMatchObject({ status: 403, code: 'FORBIDDEN' });
    expect(invalidFilter.body).toMatchObject({ status: 400, code: 'INVALID_TICKET_FILTER' });
  });
});
