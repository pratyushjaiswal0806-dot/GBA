import { useEffect, useState } from 'react';
import { requestJson } from '../api/client.js';
import { text } from '../i18n/en.js';

function describeStatus(state, health) {
  if (state === 'loading') return text.health.checking;
  if (state === 'error') return text.health.offline;
  return health.database === 'ok' ? text.health.ready : text.health.degraded;
}

export function ServiceStatus() {
  const [status, setStatus] = useState({ state: 'loading', health: null });

  useEffect(() => {
    const controller = new AbortController();

    requestJson('/api/health', { signal: controller.signal })
      .then((health) => setStatus({ state: 'ready', health }))
      .catch((error) => {
        if (error.name !== 'AbortError') setStatus({ state: 'error', health: null });
      });

    return () => controller.abort();
  }, []);

  return (
    <p className="service-status" data-state={status.state === 'ready' && status.health.database === 'ok' ? 'good' : status.state === 'loading' ? 'idle' : 'warn'} role="status">
      {text.health.title}: <strong>{describeStatus(status.state, status.health)}</strong>
    </p>
  );
}
