import { randomUUID } from 'node:crypto';
import request from 'supertest';
import sharp from 'sharp';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/application.js';
import { createReportRateLimit } from '../src/middleware/rateLimit.js';
import { createPhotoUpload } from '../src/middleware/upload.js';
import { createMediaService } from '../src/modules/media/media.service.js';
import { createReportRouter } from '../src/modules/tickets/report.routes.js';
import { createReportService } from '../src/modules/tickets/report.service.js';
import { createTestDatabase } from './setup/testDatabase.js';

const wardAPoint = { lat: 12.972, lng: 77.593 };
const outsidePoint = { lat: 12.99, lng: 77.62 };
const maxUploadMb = 5;

async function createJpeg() {
  return sharp({
    create: { width: 20, height: 20, channels: 3, background: '#2266aa' }
  }).jpeg().toBuffer();
}

function createStorage() {
  const uploads = new Map();

  return {
    uploads,
    from: () => ({
      upload: async (path, buffer) => {
        uploads.set(path, buffer);
        return { error: null };
      },
      remove: async (paths) => {
        paths.forEach((path) => uploads.delete(path));
        return { error: null };
      }
    })
  };
}

describe('POST /api/reports', () => {
  let db;
  let app;
  let storage;

  beforeAll(async () => {
    db = await createTestDatabase();
    const officerId = randomUUID();
    await db.query('INSERT INTO auth.users (id) VALUES ($1)', [officerId]);
    await db.query(
      `INSERT INTO staff (id, full_name, role, ward_id)
       VALUES ($1, 'Ward A Officer', 'OFFICER', 1)`,
      [officerId]
    );

    storage = createStorage();
    const mediaService = createMediaService({ storage, bucket: 'ticket-media' });
    const reportService = createReportService({
      db,
      mediaService,
      geocoder: { reverse: async () => ({ street: 'Test Road', area: 'Test Area' }) }
    });
    const reportRouter = createReportRouter({
      createReport: reportService.create,
      rateLimit: createReportRateLimit({ maxRequests: 20 }),
      upload: createPhotoUpload({ maxUploadMb })
    });
    app = createApp({ db, reportRouter, frontendDist: '/tmp/gba-civic-tracker-no-build' });
  });

  afterAll(async () => {
    if (db) {
      await db.close();
    }
  });

  it.each([
    'FOOTPATH_ENCROACHMENT',
    'ROAD_DAMAGE',
    'GARBAGE_DUMPING'
  ])('creates an OPEN report for %s with media and history', async (categoryCode) => {
    const image = await createJpeg();
    const response = await request(app)
      .post('/api/reports')
      .field('categoryCode', categoryCode)
      .field('description', 'A safe test report')
      .field('lat', String(wardAPoint.lat))
      .field('lng', String(wardAPoint.lng))
      .attach('photo', image, { filename: 'issue.jpg', contentType: 'image/jpeg' });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ status: 'OPEN', ward: 'Sample Ward A' });
    expect(response.body.publicCode).toMatch(/^[A-Z0-9]{8}$/);

    const ticket = await db.query(
      `SELECT t.status, t.is_demo, t.assigned_officer_id, m.type, h.to_status
       FROM tickets t
       JOIN media m ON m.ticket_id = t.id
       JOIN status_history h ON h.ticket_id = t.id
       WHERE t.public_code = $1`,
      [response.body.publicCode]
    );

    expect(ticket.rows).toEqual([{
      status: 'OPEN',
      is_demo: false,
      assigned_officer_id: expect.any(String),
      type: 'ORIGINAL',
      to_status: 'OPEN'
    }]);
    expect(storage.uploads.size).toBeGreaterThan(0);
  });

  it('handles two concurrent report submissions without corrupting either ticket', async () => {
    const [firstImage, secondImage] = await Promise.all([createJpeg(), createJpeg()]);
    const submit = (description, image) => request(app)
      .post('/api/reports')
      .field('categoryCode', 'FOOTPATH_ENCROACHMENT')
      .field('description', description)
      .field('lat', String(wardAPoint.lat))
      .field('lng', String(wardAPoint.lng))
      .attach('photo', image, { filename: `${description}.jpg`, contentType: 'image/jpeg' });

    const responses = await Promise.all([
      submit('Concurrent report one', firstImage),
      submit('Concurrent report two', secondImage)
    ]);

    expect(responses.map((response) => response.status)).toEqual([201, 201]);
    expect(new Set(responses.map((response) => response.body.publicCode)).size).toBe(2);
    const saved = await db.query(
      `SELECT t.public_code, t.description, count(m.id)::int AS media_count
       FROM tickets t
       JOIN media m ON m.ticket_id = t.id
       WHERE t.public_code = ANY($1::text[])
       GROUP BY t.public_code, t.description`,
      [responses.map((response) => response.body.publicCode)]
    );
    expect(saved.rows).toHaveLength(2);
    expect(saved.rows.every((row) => row.media_count === 1)).toBe(true);
  });

  it('refuses an outside-pilot location without storing a photo', async () => {
    const uploadsBefore = storage.uploads.size;
    const response = await request(app)
      .post('/api/reports')
      .field('categoryCode', 'FOOTPATH_ENCROACHMENT')
      .field('description', 'Outside location')
      .field('lat', String(outsidePoint.lat))
      .field('lng', String(outsidePoint.lng))
      .attach('photo', await createJpeg(), 'outside.jpg');

    expect(response.status).toBe(422);
    expect(response.body.code).toBe('OUTSIDE_PILOT_AREA');
    expect(storage.uploads.size).toBe(uploadsBefore);
  });

  it('refuses a fake image and a file over the size limit', async () => {
    const fake = await request(app)
      .post('/api/reports')
      .field('categoryCode', 'FOOTPATH_ENCROACHMENT')
      .field('description', 'Fake image')
      .field('lat', String(wardAPoint.lat))
      .field('lng', String(wardAPoint.lng))
      .attach('photo', Buffer.from('not a real photo'), 'fake.jpg');
    const oversized = await request(app)
      .post('/api/reports')
      .field('categoryCode', 'FOOTPATH_ENCROACHMENT')
      .field('description', 'Large photo')
      .field('lat', String(wardAPoint.lat))
      .field('lng', String(wardAPoint.lng))
      .attach('photo', Buffer.alloc((maxUploadMb * 1024 * 1024) + 1), 'large.jpg');

    expect(fake.status).toBe(415);
    expect(fake.body.code).toBe('INVALID_PHOTO');
    expect(oversized.status).toBe(413);
    expect(oversized.body.code).toBe('PHOTO_TOO_LARGE');
  });
});
