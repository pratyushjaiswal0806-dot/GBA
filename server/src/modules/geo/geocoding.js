import { createCoordinateCacheKey, selectAddressFields } from './geoUtils.js';

const NOMINATIM_TIMEOUT_MS = 3_000;
const NOMINATIM_MIN_INTERVAL_MS = 1_000;

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export function createGeocoder({ userAgent, baseUrl, fetchImpl = fetch }) {
  const cache = new Map();
  let nextRequestAt = 0;

  async function waitForRequestSlot() {
    const now = Date.now();
    const scheduledAt = Math.max(now, nextRequestAt);
    nextRequestAt = scheduledAt + NOMINATIM_MIN_INTERVAL_MS;

    if (scheduledAt > now) {
      await wait(scheduledAt - now);
    }
  }

  async function reverse({ lat, lng }) {
    const cacheKey = createCoordinateCacheKey({ lat, lng });

    if (cache.has(cacheKey)) {
      return cache.get(cacheKey);
    }

    await waitForRequestSlot();

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), NOMINATIM_TIMEOUT_MS);

    try {
      const url = new URL('/reverse', `${baseUrl}/`);
      url.searchParams.set('format', 'jsonv2');
      url.searchParams.set('lat', String(lat));
      url.searchParams.set('lon', String(lng));
      url.searchParams.set('addressdetails', '1');

      const response = await fetchImpl(url, {
        headers: {
          Accept: 'application/json',
          'User-Agent': userAgent
        },
        signal: controller.signal
      });

      if (!response.ok) {
        cache.set(cacheKey, null);
        return null;
      }

      const data = await response.json();
      const address = selectAddressFields(data.address);
      cache.set(cacheKey, address);
      return address;
    } catch {
      cache.set(cacheKey, null);
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }

  return { reverse };
}
