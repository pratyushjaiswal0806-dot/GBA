import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestDatabase } from './setup/testDatabase.js';

describe('database migrations', () => {
  let db;

  beforeAll(async () => {
    db = await createTestDatabase();
  });

  afterAll(async () => {
    if (db) {
      await db.close();
    }
  });

  it('creates the seven tables with row-level security enabled', async () => {
    const tables = await db.query(
      `SELECT table_name
       FROM information_schema.tables
       WHERE table_schema = 'public'
       ORDER BY table_name`
    );
    const tableNames = tables.rows.map((row) => row.table_name);

    expect(tableNames).toEqual([
      'action_reports',
      'categories',
      'media',
      'staff',
      'status_history',
      'tickets',
      'wards'
    ]);

    const security = await db.query(
      `SELECT relname, relrowsecurity
       FROM pg_class
       JOIN pg_namespace ON pg_namespace.oid = pg_class.relnamespace
       WHERE pg_namespace.nspname = 'public'
         AND relname = ANY($1::text[])`,
      [tableNames]
    );

    expect(security.rows).toHaveLength(7);
    expect(security.rows.every((row) => row.relrowsecurity)).toBe(true);
  });

  it('loads three wards and three reportable categories', async () => {
    const wards = await db.query('SELECT count(*)::int AS count FROM wards');
    const categories = await db.query(
      'SELECT count(*)::int AS count FROM categories WHERE reportable = TRUE'
    );

    expect(wards.rows[0].count).toBe(3);
    expect(categories.rows[0].count).toBe(3);
  });
});
