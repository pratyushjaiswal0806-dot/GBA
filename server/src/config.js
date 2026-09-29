import { loadEnvFile } from 'node:process';
import { fileURLToPath } from 'node:url';

const envFilePath = fileURLToPath(new URL('../.env', import.meta.url));
const frontendDistPath = fileURLToPath(new URL('../../frontend/dist', import.meta.url));

function loadLocalEnvironment() {
  try {
    loadEnvFile(envFilePath);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw new Error(`Could not read server/.env: ${error.message}`);
    }
  }
}

function requireSetting(environment, name) {
  const value = environment[name]?.trim();

  if (!value) {
    throw new Error(`Missing required setting: ${name}. Set it in server/.env.`);
  }

  return value;
}

export { requireSetting };

function parsePort(environment) {
  const rawPort = requireSetting(environment, 'PORT');
  const port = Number(rawPort);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('Invalid setting: PORT must be an integer between 1 and 65535.');
  }

  return port;
}

function parseUrl(environment, name) {
  const value = requireSetting(environment, name);

  try {
    return new URL(value).toString().replace(/\/$/, '');
  } catch {
    throw new Error(`Invalid setting: ${name} must be a valid URL.`);
  }
}

function parsePositiveInteger(environment, name) {
  const value = Number(requireSetting(environment, name));

  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`Invalid setting: ${name} must be a positive integer.`);
  }

  return value;
}

function loadBaseConfig(environment = process.env) {
  if (environment === process.env) {
    loadLocalEnvironment();
  }

  return {
    port: parsePort(environment),
    databaseUrl: requireSetting(environment, 'DATABASE_URL'),
    supabaseUrl: requireSetting(environment, 'SUPABASE_URL'),
    supabaseSecretKey: requireSetting(environment, 'SUPABASE_SECRET_KEY'),
    frontendDist: frontendDistPath
  };
}

export function loadConfig(environment = process.env) {
  const config = loadBaseConfig(environment);

  return {
    ...config,
    nominatimUserAgent: requireSetting(environment, 'NOMINATIM_USER_AGENT'),
    nominatimBaseUrl: parseUrl(environment, 'NOMINATIM_BASE_URL'),
    supabaseBucket: requireSetting(environment, 'SUPABASE_BUCKET'),
    signedUrlSeconds: parsePositiveInteger(environment, 'SIGNED_URL_SECONDS'),
    maxUploadMb: parsePositiveInteger(environment, 'MAX_UPLOAD_MB'),
    rateLimitReportsPerHour: parsePositiveInteger(environment, 'RATE_LIMIT_REPORTS_PER_HOUR')
  };
}

export function loadSeedConfig(environment = process.env) {
  const config = loadBaseConfig(environment);

  return {
    ...config,
    seedDemoPassword: requireSetting(environment, 'SEED_DEMO_PASSWORD')
  };
}
