import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { ApiError } from '../src/utils/ApiError.js';

function createErrorApp() {
  const router = express.Router();
  router.get('/errors/unexpected', (request, response, next) => {
    next(new Error('private stack detail'));
  });
  router.get('/errors/:status', (request, response, next) => {
    next(new ApiError(Number(request.params.status), 'TEST_ERROR', 'Test error.'));
  });
  router.post('/errors/echo', (request, response) => response.json(request.body));

  return createApp({
    db: { checkConnection: async () => {}, query: async () => ({ rows: [] }) },
    reportRouter: router,
    frontendDist: '/tmp/gba-civic-tracker-no-build'
  });
}

describe('API error handling', () => {
  const app = createErrorApp();

  it.each([400, 401, 403, 404, 409, 413, 415, 422, 429])('returns the standard shape for %i', async (status) => {
    const response = await request(app).get(`/api/errors/${status}`);

    expect(response.status).toBe(status);
    expect(response.body).toEqual({ status, code: 'TEST_ERROR', message: 'Test error.' });
  });

  it('hides unexpected error details', async () => {
    const response = await request(app).get('/api/errors/unexpected');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      status: 500,
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Internal server error.'
    });
    expect(JSON.stringify(response.body)).not.toContain('private stack detail');
  });

  it('maps malformed JSON to 400', async () => {
    const response = await request(app)
      .post('/api/errors/echo')
      .set('Content-Type', 'application/json')
      .send('{"broken":');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      status: 400,
      code: 'INVALID_JSON',
      message: 'Request body contains invalid JSON.'
    });
  });

  it('maps an oversized JSON body to 413', async () => {
    const response = await request(app)
      .post('/api/errors/echo')
      .send({ value: 'x'.repeat(110000) });

    expect(response.status).toBe(413);
    expect(response.body).toEqual({
      status: 413,
      code: 'PAYLOAD_TOO_LARGE',
      message: 'Request body is too large.'
    });
  });
});
