import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/application.js';
import { createReportRateLimit } from '../src/middleware/rateLimit.js';
import { createPhotoUpload } from '../src/middleware/upload.js';
import { createReportRouter } from '../src/modules/tickets/report.routes.js';

describe('report rate limit', () => {
  it('refuses the second request once the configured limit is reached', async () => {
    const reportRouter = createReportRouter({
      createReport: async () => ({ publicCode: 'TESTCODE' }),
      rateLimit: createReportRateLimit({ maxRequests: 1 }),
      upload: createPhotoUpload({ maxUploadMb: 5 })
    });
    const app = createApp({
      db: { checkConnection: async () => {}, query: async () => ({ rows: [] }) },
      reportRouter,
      frontendDist: '/tmp/gba-civic-tracker-no-build'
    });

    const first = await request(app).post('/api/reports').send({});
    const second = await request(app).post('/api/reports').send({});

    expect(first.status).toBe(400);
    expect(second.status).toBe(429);
    expect(second.body.code).toBe('RATE_LIMITED');
  });
});
