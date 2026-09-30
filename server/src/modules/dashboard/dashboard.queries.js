const resolvedFilter = "t.status = 'CLOSED'";
const openFilter = "t.status NOT IN ('CLOSED', 'REJECTED')";

export async function findSummary(db) {
  const result = await db.query(
    `SELECT count(t.id)::int AS total,
            (count(t.id) FILTER (WHERE ${openFilter}))::int AS open,
            (count(t.id) FILTER (WHERE ${resolvedFilter}))::int AS resolved,
            COALESCE(bool_or(t.is_demo), FALSE) AS "isDemoData"
     FROM tickets t`
  );
  return result.rows[0];
}

export async function findByWard(db) {
  const result = await db.query(
    `SELECT w.name AS ward,
            count(t.id)::int AS total,
            (count(t.id) FILTER (WHERE ${openFilter}))::int AS open,
            (count(t.id) FILTER (WHERE ${resolvedFilter}))::int AS resolved
     FROM wards w
     LEFT JOIN tickets t ON t.ward_id = w.id
     GROUP BY w.id, w.name
     ORDER BY w.name`
  );
  return result.rows;
}

export async function findByCategory(db) {
  const result = await db.query(
    `SELECT c.code, c.name,
            count(t.id)::int AS total,
            (count(t.id) FILTER (WHERE ${openFilter}))::int AS open,
            (count(t.id) FILTER (WHERE ${resolvedFilter}))::int AS resolved
     FROM categories c
     LEFT JOIN tickets t ON t.category_id = c.id
     WHERE c.reportable = TRUE
     GROUP BY c.id, c.code, c.name
     ORDER BY c.id`
  );
  return result.rows;
}
