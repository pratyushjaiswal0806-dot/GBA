import { useCallback, useEffect, useState } from 'react';
import { requestJson } from '../api/client.js';

export const refreshIntervalMs = 10_000;

async function fetchDashboard(interval, signal) {
  const [summary, byWard, byCategory, map, trend] = await Promise.all([
    requestJson('/api/dashboard/summary', { signal }),
    requestJson('/api/dashboard/by-ward', { signal }),
    requestJson('/api/dashboard/by-category', { signal }),
    requestJson('/api/dashboard/map', { signal }),
    requestJson(`/api/dashboard/trend?interval=${interval}`, { signal })
  ]);

  return {
    summary,
    wards: byWard.wards,
    categories: byCategory.categories,
    points: map.points,
    trend: trend.points
  };
}

export function useDashboardData(interval) {
  const [dashboard, setDashboard] = useState({ state: 'loading', data: null, refreshFailed: false });
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt((current) => current + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    let timer;

    function scheduleNext() {
      timer = setTimeout(refresh, refreshIntervalMs);
    }

    async function refresh() {
      if (document.hidden) {
        scheduleNext();
        return;
      }

      try {
        const data = await fetchDashboard(interval, controller.signal);
        if (controller.signal.aborted) return;
        setDashboard({ state: 'ready', data, refreshFailed: false });
      } catch (error) {
        if (controller.signal.aborted) return;
        setDashboard((current) => (
          current.data ? { ...current, refreshFailed: true } : { state: 'error', data: null, refreshFailed: true }
        ));
      }

      scheduleNext();
    }

    function refreshWhenVisible() {
      if (!document.hidden) {
        clearTimeout(timer);
        refresh();
      }
    }

    document.addEventListener('visibilitychange', refreshWhenVisible);
    refresh();

    return () => {
      controller.abort();
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [interval, attempt]);

  return { ...dashboard, retry };
}
