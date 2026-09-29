import fs from 'node:fs/promises';
import { loadEnvFile } from 'node:process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const { Pool } = pg;
const migrationsDirectory = fileURLToPath(new URL('../../../supabase/migrations/', import.meta.url));
const serverEnvPath = fileURLToPath(new URL('../../.env', import.meta.url));

function loadTestDatabaseUrl() {
  if (!process.env.TEST_DATABASE_URL) {
    try {
      loadEnvFile(serverEnvPath);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  const databaseUrl = process.env.TEST_DATABASE_URL?.trim();

  if (!databaseUrl) {
    throw new Error(
      'Missing TEST_DATABASE_URL. Start a local PostGIS database and set TEST_DATABASE_URL in server/.env.'
    );
  }

  const parsedUrl = new URL(databaseUrl);

  if (!['localhost', '127.0.0.1', '::1'].includes(parsedUrl.hostname)) {
    throw new Error('TEST_DATABASE_URL must point to a local database.');
  }

  return databaseUrl;
}

async function readMigrations() {
  const names = (await fs.readdir(migrationsDirectory))
    .filter((name) => name.endsWith('.sql'))
    .sort();

  return Promise.all(names.map(async (name) => ({
    name,
    sql: await fs.readFile(path.join(migrationsDirectory, name), 'utf8')
  })));
}

async function resetDatabase(acquireClient) {
  const client = await acquireClient();

  try {
    await client.query('DROP EXTENSION IF EXISTS postgis CASCADE');
    await client.query('DROP SCHEMA IF EXISTS public CASCADE');
    await client.query('DROP SCHEMA IF EXISTS extensions CASCADE');
    await client.query('DROP SCHEMA IF EXISTS auth CASCADE');
    await client.query('CREATE SCHEMA public');
    await client.query('CREATE SCHEMA extensions');
    await client.query('CREATE SCHEMA auth');
    await client.query('CREATE TABLE auth.users (id UUID PRIMARY KEY)');

    for (const migration of await readMigrations()) {
      await client.query(migration.sql);
    }
  } finally {
    client.release();
  }
}

export async function createTestDatabase() {
  const pool = new Pool({ connectionString: loadTestDatabaseUrl() });
  const connectionReady = new WeakMap();

  pool.on('connect', (client) => {
    connectionReady.set(client, client.query('SET search_path TO public, extensions'));
  });

  async function acquireClient() {
    const client = await pool.connect();

    try {
      await connectionReady.get(client);
      return client;
    } catch (error) {
      client.release();
      throw error;
    }
  }

  async function query(text, values) {
    const client = await acquireClient();

    try {
      return await client.query(text, values);
    } finally {
      client.release();
    }
  }

  await resetDatabase(acquireClient);

  return {
    query,
    checkConnection: async () => {
      await query('SELECT 1');
    },
    withTransaction: async (work) => {
      const client = await acquireClient();

      try {
        await client.query('BEGIN');
        const result = await work(client);
        await client.query('COMMIT');
        return result;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    },
    close: () => pool.end()
  };
}
