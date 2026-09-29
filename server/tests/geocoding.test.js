import { describe, expect, it } from 'vitest';
import { createGeocoder } from '../src/modules/geo/geocoding.js';

describe('Nominatim geocoding', () => {
  it('caches a reverse lookup and sends the identifying user agent', async () => {
    const calls = [];
    const geocoder = createGeocoder({
      userAgent: 'gba-test-suite',
      baseUrl: 'https://nominatim.example.test',
      fetchImpl: async (url, options) => {
        calls.push({ url, options });
        return {
          ok: true,
          json: async () => ({
            address: { road: 'Example Road', neighbourhood: 'Example Area' }
          })
        };
      }
    });

    const first = await geocoder.reverse({ lat: 12.972, lng: 77.593 });
    const second = await geocoder.reverse({ lat: 12.972, lng: 77.593 });

    expect(first).toEqual({ street: 'Example Road', area: 'Example Area' });
    expect(second).toEqual(first);
    expect(calls).toHaveLength(1);
    expect(calls[0].url.pathname).toBe('/reverse');
    expect(calls[0].options.headers['User-Agent']).toBe('gba-test-suite');
  });

  it('falls back to ward-only data when the provider fails', async () => {
    const geocoder = createGeocoder({
      userAgent: 'gba-test-suite',
      baseUrl: 'https://nominatim.example.test',
      fetchImpl: async () => {
        throw new Error('provider unavailable');
      }
    });

    await expect(geocoder.reverse({ lat: 12.972, lng: 77.593 })).resolves.toBeNull();
  });
});
