import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestDatabase } from './setup/testDatabase.js';

describe('database close safety net', () => {
  let db;

  beforeAll(async () => {
    db = await createTestDatabase();
  });

  afterAll(async () => {
    if (db) {
      await db.close();
    }
  });

  it('refuses CLOSED without a verifier and close time', async () => {
    const userId = randomUUID();
    await db.query('INSERT INTO auth.users (id) VALUES ($1)', [userId]);
    const ward = await db.query("SELECT id FROM wards WHERE name = 'Sample Ward A'");
    const category = await db.query(
      "SELECT id FROM categories WHERE code = 'FOOTPATH_ENCROACHMENT'"
    );
    await db.query(
      `INSERT INTO staff (id, full_name, role, ward_id)
       VALUES ($1, 'Test Officer', 'OFFICER', $2)`,
      [userId, ward.rows[0].id]
    );
    const ticket = await db.query(
      `INSERT INTO tickets (public_code, category_id, description, lat, lng, ward_id)
       VALUES ('TESTCLOSE', $1, 'Test close rule', 12.972, 77.593, $2)
       RETURNING id`,
      [category.rows[0].id, ward.rows[0].id]
    );

    await expect(
      db.query('UPDATE tickets SET status = \'CLOSED\' WHERE id = $1', [ticket.rows[0].id])
    ).rejects.toMatchObject({ code: '23514' });
  });
});
