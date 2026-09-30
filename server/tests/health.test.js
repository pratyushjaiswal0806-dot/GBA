import http from 'node:http';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/application.js';

function appWithDatabase(checkConnection) {
  return createApp({
    db: {
      checkConnection,
      query: async () => ({ rows: [] })
    },
    frontendDist: '/tmp/gba-civic-tracker-no-build'
  });
}

async function withServer(checkConnection, testRequest) {
  const server = http.createServer(appWithDatabase(checkConnection));

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });

  try {
    return await testRequest(request(server));
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

describe('health endpoint', () => {
  it('reports the server and database as available', async () => {
    const response = await withServer(async () => {}, (client) => (
      client.get('/api/health')
    ));

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ server: 'ok', database: 'ok' });
  });

  it('reports a database failure without hiding the server response', async () => {
    const response = await withServer(async () => {
      throw new Error('database unavailable');
    }, (client) => client.get('/api/health'));

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ server: 'ok', database: 'down' });
  });

  it('returns the standard error shape for an unknown API route', async () => {
    const response = await withServer(async () => {}, (client) => (
      client.get('/api/does-not-exist')
    ));

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      status: 404,
      code: 'NOT_FOUND',
      message: 'Route not found.'
    });
  });
});
