import fs from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestDatabase } from './setup/testDatabase.js';

const resetScriptPath = fileURLToPath(new URL('../scripts/reset-demo.sql', import.meta.url));

describe('reset-demo.sql', () => {
  let db;
  let officerId;
  let categoryId;
  let demoTicketId;
  let liveTicketId;

  beforeAll(async () => {
    db = await createTestDatabase();
    officerId = randomUUID();
    const verifierId = randomUUID();
    await db.query('INSERT INTO auth.users (id) VALUES ($1), ($2)', [officerId, verifierId]);
    await db.query(
      `INSERT INTO staff (id, full_name, role, ward_id) VALUES
       ($1, 'Reset Officer', 'OFFICER', 1), ($2, 'Reset Verifier', 'VERIFIER', NULL)`,
      [officerId, verifierId]
    );
    categoryId = (await db.query("SELECT id FROM categories WHERE code = 'FOOTPATH_ENCROACHMENT'")).rows[0].id;

    const tickets = await db.query(
      `INSERT INTO tickets (public_code, category_id, description, lat, lng, ward_id, status, assigned_officer_id, is_demo)
       VALUES
         ($1, $2, 'Demo ticket', 12.972, 77.593, 1, 'PENDING_VERIFICATION', $3, TRUE),
         ($4, $2, 'Live ticket', 12.972, 77.593, 1, 'PENDING_VERIFICATION', $3, FALSE)
       RETURNING id, is_demo`,
      [`D${randomUUID().replaceAll('-', '').slice(0, 11)}`, categoryId, officerId, `L${randomUUID().replaceAll('-', '').slice(0, 11)}`]
    );
    demoTicketId = tickets.rows.find((ticket) => ticket.is_demo).id;
    liveTicketId = tickets.rows.find((ticket) => !ticket.is_demo).id;

    for (const ticketId of [demoTicketId, liveTicketId]) {
      await db.query(
        `INSERT INTO media (ticket_id, type, storage_path, content_type, size_bytes)
         VALUES ($1, 'ORIGINAL', $2, 'image/jpeg', 10)`,
        [ticketId, `tickets/${ticketId}/original.jpg`]
      );
      await db.query(
        `INSERT INTO status_history (ticket_id, from_status, to_status)
         VALUES ($1, NULL, 'PENDING_VERIFICATION')`,
        [ticketId]
      );
      const report = await db.query(
        `INSERT INTO action_reports (ticket_id, officer_id, remarks, lat, lng)
         VALUES ($1, $2, 'Reset test action', 12.972, 77.593)
         RETURNING id`,
        [ticketId, officerId]
      );
      await db.query(
        `INSERT INTO media (ticket_id, action_report_id, type, storage_path, content_type, size_bytes)
         VALUES ($1, $2, 'ACTION', $3, 'image/jpeg', 10)`,
        [ticketId, report.rows[0].id, `tickets/${ticketId}/action.jpg`]
      );
    }
  });

  afterAll(async () => {
    if (db) await db.close();
  });

  it('keeps demo tickets and staff while removing live ticket data', async () => {
    const script = await fs.readFile(resetScriptPath, 'utf8');
    await db.query(script);

    const tickets = await db.query('SELECT id, is_demo FROM tickets ORDER BY id');
    const reports = await db.query('SELECT ticket_id FROM action_reports');
    const media = await db.query('SELECT ticket_id FROM media');
    const history = await db.query('SELECT ticket_id FROM status_history');
    const staff = await db.query('SELECT count(*)::int AS count FROM staff');

    expect(tickets.rows).toEqual([{ id: demoTicketId, is_demo: true }]);
    expect(reports.rows).toEqual([{ ticket_id: demoTicketId }]);
    expect(media.rows).toHaveLength(2);
    expect(media.rows.every((row) => row.ticket_id === demoTicketId)).toBe(true);
    expect(history.rows).toEqual([{ ticket_id: demoTicketId }]);
    expect(staff.rows[0].count).toBe(2);
    expect(liveTicketId).not.toBe(demoTicketId);
  });
});
