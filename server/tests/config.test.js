import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config.js';

describe('loadConfig', () => {
  it('loads the Phase 1 settings', () => {
    const config = loadConfig({
      PORT: '3000',
      DATABASE_URL: 'postgresql://example.test/gba',
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_SECRET_KEY: 'secret-for-test'
    });

    expect(config.port).toBe(3000);
    expect(config.databaseUrl).toBe('postgresql://example.test/gba');
    expect(config.supabaseUrl).toBe('https://example.supabase.co');
    expect(config.supabaseSecretKey).toBe('secret-for-test');
    expect(config.frontendDist).toContain('frontend');
  });

  it('names a missing setting clearly', () => {
    expect(() => loadConfig({ PORT: '3000' })).toThrow(
      'Missing required setting: DATABASE_URL'
    );
  });

  it('rejects an invalid port', () => {
    expect(() => loadConfig({
      PORT: 'not-a-port',
      DATABASE_URL: 'postgresql://example.test/gba',
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_SECRET_KEY: 'secret-for-test'
    })).toThrow('PORT must be an integer');
  });
});
