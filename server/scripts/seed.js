import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDb } from '../src/db.js';
import { loadSeedConfig } from '../src/config.js';
import { createSupabaseAdmin } from '../src/supabase.js';

const DEMO_PASSWORD_USERS = [
  {
    email: 'officer.a@demo.example',
    fullName: 'Demo Officer A',
    role: 'OFFICER',
    wardName: 'Sample Ward A'
  },
  {
    email: 'officer.b@demo.example',
    fullName: 'Demo Officer B',
    role: 'OFFICER',
    wardName: 'Sample Ward B'
  },
  {
    email: 'officer.c@demo.example',
    fullName: 'Demo Officer C',
    role: 'OFFICER',
    wardName: 'Sample Ward C'
  },
  {
    email: 'verifier@demo.example',
    fullName: 'Demo Verifier',
    role: 'VERIFIER',
    wardName: null
  }
];

export const SAMPLE_TEST_POINTS = [
  { name: 'Sample Ward A', lat: 12.972, lng: 77.593 },
  { name: 'Sample Ward B', lat: 12.972, lng: 77.603 },
  { name: 'Sample Ward C', lat: 12.98, lng: 77.593 },
  { name: 'Outside pilot wards', lat: 12.99, lng: 77.62 }
];

function daysAgo(days) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date;
}

const DEMO_TICKETS = [
  {
    publicCode: 'DEMOA001',
    categoryCode: 'FOOTPATH_ENCROACHMENT',
    wardName: 'Sample Ward A',
    officerEmail: 'officer.a@demo.example',
    status: 'OPEN',
    description: 'Demo footpath encroachment awaiting officer action.',
    lat: 12.9715,
    lng: 77.5925,
    street: 'Demo Road A',
    area: 'Sample Area A',
    supportCount: 3,
    createdAt: daysAgo(6)
  },
  {
    publicCode: 'DEMOA002',
    categoryCode: 'ROAD_DAMAGE',
    wardName: 'Sample Ward A',
    officerEmail: 'officer.a@demo.example',
    status: 'CLOSED',
    description: 'Demo pothole report verified as fixed.',
    lat: 12.974,
    lng: 77.595,
    street: 'Demo Road A',
    area: 'Sample Area A',
    supportCount: 2,
    createdAt: daysAgo(15),
    closedByEmail: 'verifier@demo.example',
    closedAt: daysAgo(10)
  },
  {
    publicCode: 'DEMOB001',
    categoryCode: 'GARBAGE_DUMPING',
    wardName: 'Sample Ward B',
    officerEmail: 'officer.b@demo.example',
    status: 'IN_PROGRESS',
    description: 'Demo garbage dumping report being attended to.',
    lat: 12.9715,
    lng: 77.6025,
    street: 'Demo Road B',
    area: 'Sample Area B',
    supportCount: 1,
    createdAt: daysAgo(4)
  },
  {
    publicCode: 'DEMOB002',
    categoryCode: 'FOOTPATH_ENCROACHMENT',
    wardName: 'Sample Ward B',
    officerEmail: 'officer.b@demo.example',
    status: 'REOPENED',
    description: 'Demo footpath report returned for another action report.',
    lat: 12.9745,
    lng: 77.605,
    street: 'Demo Road B',
    area: 'Sample Area B',
    supportCount: 4,
    createdAt: daysAgo(9)
  },
  {
    publicCode: 'DEMOC001',
    categoryCode: 'ROAD_DAMAGE',
    wardName: 'Sample Ward C',
    officerEmail: 'officer.c@demo.example',
    status: 'CLOSED',
    description: 'Demo road damage report verified as fixed.',
    lat: 12.9795,
    lng: 77.5925,
    street: 'Demo Road C',
    area: 'Sample Area C',
    supportCount: 2,
    createdAt: daysAgo(21),
    closedByEmail: 'verifier@demo.example',
    closedAt: daysAgo(17)
  },
  {
    publicCode: 'DEMOC002',
    categoryCode: 'GARBAGE_DUMPING',
    wardName: 'Sample Ward C',
    officerEmail: 'officer.c@demo.example',
    status: 'OPEN',
    description: 'Demo garbage dumping report awaiting action.',
    lat: 12.9815,
    lng: 77.596,
    street: 'Demo Road C',
    area: 'Sample Area C',
    supportCount: 1,
    createdAt: daysAgo(2)
  }
];

async function findAuthUserByEmail(supabaseAdmin, email) {
  let page = 1;

  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage: 1000
    });

    if (error) {
      throw new Error(`Could not list Supabase Auth users: ${error.message}`);
    }

    const user = data.users.find((candidate) => candidate.email === email);

    if (user) {
      return user;
    }

    if (data.users.length < 1000) {
      return null;
    }

    page += 1;
  }
}

async function ensureAuthUser(supabaseAdmin, person, password) {
  const existingUser = await findAuthUserByEmail(supabaseAdmin, person.email);

  if (existingUser) {
    return existingUser;
  }

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: person.email,
    password,
    email_confirm: true
  });

  if (error) {
    throw new Error(`Could not create demo user ${person.email}: ${error.message}`);
  }

  if (!data.user) {
    throw new Error(`Supabase did not return a user for ${person.email}.`);
  }

  return data.user;
}

async function getRowsByNames(client, table, names) {
  const result = await client.query(
    `SELECT id, name FROM ${table} WHERE name = ANY($1::text[])`,
    [names]
  );

  const rowsByName = new Map(result.rows.map((row) => [row.name, row.id]));

  for (const name of names) {
    if (!rowsByName.has(name)) {
      throw new Error(`Missing ${table} row: ${name}. Apply the migrations first.`);
    }
  }

  return rowsByName;
}

async function getCategoryIds(client) {
  const result = await client.query(
    'SELECT id, code FROM categories WHERE code = ANY($1::text[])',
    [DEMO_TICKETS.map((ticket) => ticket.categoryCode)]
  );
  const idsByCode = new Map(result.rows.map((row) => [row.code, row.id]));

  for (const ticket of DEMO_TICKETS) {
    if (!idsByCode.has(ticket.categoryCode)) {
      throw new Error(`Missing category row: ${ticket.categoryCode}. Apply the migrations first.`);
    }
  }

  return idsByCode;
}

async function upsertStaff(client, people, users, wardIds) {
  for (const person of people) {
    await client.query(
      `INSERT INTO staff (id, full_name, role, ward_id)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO UPDATE SET
         full_name = EXCLUDED.full_name,
         role = EXCLUDED.role,
         ward_id = EXCLUDED.ward_id,
         active = TRUE`,
      [
        users.get(person.email).id,
        person.fullName,
        person.role,
        person.wardName ? wardIds.get(person.wardName) : null
      ]
    );
  }
}

async function insertDemoTickets(client, users, wardIds, categoryIds) {
  let insertedCount = 0;

  for (const ticket of DEMO_TICKETS) {
    const closedById = ticket.closedByEmail
      ? users.get(ticket.closedByEmail).id
      : null;
    const result = await client.query(
      `INSERT INTO tickets (
         public_code, category_id, description, lat, lng, street, area, ward_id,
         status, assigned_officer_id, support_count, is_demo, closed_by, closed_at,
         created_at, updated_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, TRUE, $12, $13, $14, $14)
       ON CONFLICT (public_code) DO NOTHING
       RETURNING id`,
      [
        ticket.publicCode,
        categoryIds.get(ticket.categoryCode),
        ticket.description,
        ticket.lat,
        ticket.lng,
        ticket.street,
        ticket.area,
        wardIds.get(ticket.wardName),
        ticket.status,
        users.get(ticket.officerEmail).id,
        ticket.supportCount,
        closedById,
        ticket.closedAt ?? null,
        ticket.createdAt
      ]
    );

    if (result.rows.length === 0) {
      continue;
    }

    insertedCount += 1;
    await client.query(
      `INSERT INTO status_history (ticket_id, from_status, to_status, changed_by)
       VALUES ($1, NULL, $2, NULL)`,
      [result.rows[0].id, ticket.status]
    );
  }

  return insertedCount;
}

export async function seedDemoData({ db, supabaseAdmin, seedDemoPassword }) {
  const users = new Map();

  for (const person of DEMO_PASSWORD_USERS) {
    const user = await ensureAuthUser(supabaseAdmin, person, seedDemoPassword);
    users.set(person.email, user);
  }

  const insertedTicketCount = await db.withTransaction(async (client) => {
    const wardIds = await getRowsByNames(
      client,
      'wards',
      DEMO_PASSWORD_USERS.filter((person) => person.wardName).map((person) => person.wardName)
    );
    const categoryIds = await getCategoryIds(client);

    await upsertStaff(client, DEMO_PASSWORD_USERS, users, wardIds);
    return insertDemoTickets(client, users, wardIds, categoryIds);
  });

  return {
    staffCount: DEMO_PASSWORD_USERS.length,
    insertedTicketCount
  };
}

async function runSeed() {
  const config = loadSeedConfig();
  const db = createDb(config);
  const supabaseAdmin = createSupabaseAdmin(config);

  try {
    await db.checkConnection();
    const result = await seedDemoData({
      db,
      supabaseAdmin,
      seedDemoPassword: config.seedDemoPassword
    });

    console.log(`Seed complete. Staff profiles available: ${result.staffCount}.`);
    console.log(`New demo tickets inserted: ${result.insertedTicketCount}.`);
    console.log('Demo staff emails:');
    for (const person of DEMO_PASSWORD_USERS) {
      console.log(`- ${person.email}`);
    }
    console.log('Test points:');
    for (const point of SAMPLE_TEST_POINTS) {
      console.log(`- ${point.name}: lat=${point.lat}, lng=${point.lng}`);
    }
  } finally {
    await db.close();
  }
}

const entryPath = process.argv[1] ? path.resolve(process.argv[1]) : '';
const modulePath = fileURLToPath(import.meta.url);

if (entryPath === modulePath) {
  runSeed().catch((error) => {
    console.error(`Seed failed: ${error.message}`);
    process.exitCode = 1;
  });
}
