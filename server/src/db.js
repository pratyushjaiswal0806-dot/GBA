import pg from 'pg';

const { Pool } = pg;

export function createDb({ databaseUrl }) {
  const pool = new Pool({ connectionString: databaseUrl });
  const connectionReady = new WeakMap();

  pool.on('connect', (client) => {
    connectionReady.set(client, client.query('SET search_path TO public, extensions'));
  });

  pool.on('error', () => {
    // Keep background pool errors from becoming uncaught process errors.
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

  async function checkConnection() {
    await query('SELECT 1');
  }

  async function withTransaction(work) {
    const client = await acquireClient();
    let transactionStarted = false;

    try {
      await client.query('BEGIN');
      transactionStarted = true;
      const result = await work(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      if (transactionStarted) {
        await client.query('ROLLBACK');
      }
      throw error;
    } finally {
      client.release();
    }
  }

  return {
    query,
    checkConnection,
    withTransaction,
    close: () => pool.end()
  };
}
