import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';
import { loadConfig } from './config.js';
import { createDb } from './db.js';
import { createGeocoder } from './modules/geo/geocoding.js';

export async function startServer() {
  const config = loadConfig();
  const db = createDb(config);
  const geocoder = createGeocoder({
    userAgent: config.nominatimUserAgent,
    baseUrl: config.nominatimBaseUrl
  });
  const app = createApp({ db, geocoder, frontendDist: config.frontendDist });

  try {
    await db.checkConnection();
    console.log('Database connected.');
  } catch {
    console.warn('Database is not reachable. The health endpoint will report database: down.');
  }

  let server;

  try {
    server = await new Promise((resolve, reject) => {
      const listener = app.listen(config.port);
      const onListening = () => {
        listener.removeListener('error', onError);
        console.log(`Server listening on port ${config.port}.`);
        resolve(listener);
      };
      const onError = (error) => {
        listener.removeListener('listening', onListening);
        reject(error);
      };

      listener.once('listening', onListening);
      listener.once('error', onError);
    });
  } catch (error) {
    await db.close();
    throw error;
  }

  const shutdown = async (signal) => {
    console.log(`Received ${signal}; shutting down.`);
    server.close(async () => {
      await db.close();
      process.exit(0);
    });
  };

  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));

  return server;
}

const entryPath = process.argv[1] ? path.resolve(process.argv[1]) : '';
const modulePath = fileURLToPath(import.meta.url);

if (entryPath === modulePath) {
  startServer().catch((error) => {
    console.error(`Startup failed: ${error.message}`);
    process.exitCode = 1;
  });
}
