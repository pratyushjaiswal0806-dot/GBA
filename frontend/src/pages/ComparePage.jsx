import { useEffect, useRef, useState } from 'react';
import { requestJson } from '../api/client.js';
import { SideBySide } from '../components/SideBySide.jsx';
import { text } from '../i18n/en.js';
import { navigate } from '../routing.js';

const reasonMaxLength = 500;

export function ComparePage({ ticketId }) {
  const [compare, setCompare] = useState({ state: 'loading', data: null, error: null });
  const [isRejecting, setIsRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [busyAction, setBusyAction] = useState(null);
  const [actionError, setActionError] = useState(null);
  const decisionLock = useRef(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function loadCompare() {
      setCompare({ state: 'loading', data: null, error: null });

      try {
        const data = await requestJson(`/api/tickets/${ticketId}/compare`, { signal: controller.signal });
        if (!controller.signal.aborted) setCompare({ state: 'ready', data, error: null });
      } catch (error) {
        if (error.name !== 'AbortError') setCompare({ state: 'error', data: null, error: error.message });
      }
    }

    loadCompare();
    return () => controller.abort();
  }, [ticketId, reloadKey]);

  async function decide(action, options = {}) {
    if (decisionLock.current) return;

    decisionLock.current = true;
    setActionError(null);
    setBusyAction(action);

    try {
      await requestJson(`/api/tickets/${ticketId}/${action}`, options);
      navigate('/verifier');
    } catch (error) {
      setActionError(error.message || text.verifier.actionError);
      setBusyAction(null);
    } finally {
      decisionLock.current = false;
    }
  }

  function submitReject(event) {
    event.preventDefault();
    const trimmed = reason.trim();

    if (!trimmed) return setActionError(text.verifier.rejectReasonMissing);
    if (trimmed.length > reasonMaxLength) return setActionError(text.verifier.rejectReasonTooLong);

    return decide('reject', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: trimmed })
    });
  }

  const backButton = <button className="text-sm font-semibold text-cyan-200 hover:text-white" onClick={() => navigate('/verifier')} type="button">← {text.verifier.backToQueue}</button>;

  if (compare.state === 'loading') return <p className="p-6 text-sm text-slate-600" role="status">{text.verifier.compareLoading}</p>;
  if (compare.state === 'error') return <main className="min-h-screen bg-slate-950 px-4 py-8 sm:px-6"><section className="mx-auto max-w-5xl">{backButton}<div className="mt-4 rounded-2xl bg-white p-5 shadow-xl sm:p-7"><p className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">{compare.error || text.api.networkError}</p><button className="mt-5 rounded-lg bg-cyan-700 px-4 py-3 text-sm font-semibold text-white hover:bg-cyan-800" onClick={() => setReloadKey((current) => current + 1)} type="button">{text.verifier.retry}</button></div></section></main>;

  const { original, action, distanceMeters, farWarning } = compare.data;
  const isBusy = busyAction !== null;

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-900 sm:px-6">
      <section className="mx-auto max-w-5xl">
        {backButton}
        <article className="mt-4 rounded-2xl bg-white p-5 shadow-xl sm:p-7">
          <h1 className="text-2xl font-semibold text-slate-900">{text.verifier.compareTitle}</h1>

          <div className={`mt-5 rounded-xl px-4 py-3 text-sm ${farWarning ? 'bg-amber-50 text-amber-950' : 'bg-slate-50 text-slate-800'}`} role={farWarning ? 'alert' : undefined}>
            <p><span className="font-semibold">{text.verifier.distance}:</span> {distanceMeters === null ? text.verifier.distanceUnknown : `${distanceMeters} ${text.verifier.meters}`}</p>
            {farWarning && <p className="mt-1 font-semibold">{text.verifier.farWarning}</p>}
          </div>

          <div className="mt-5"><SideBySide action={action} original={original} /></div>

          <section className="mt-5">
            <h2 className="text-sm font-semibold text-slate-700">{text.verifier.remarks}</h2>
            <p className="mt-1 break-words whitespace-pre-wrap text-slate-800">{action.remarks}</p>
          </section>

          {isRejecting ? (
            <form className="mt-6" onSubmit={submitReject}>
              <label className="block text-sm font-semibold text-slate-800" htmlFor="reject-reason">{text.verifier.rejectReasonLabel}</label>
              <p className="mt-1 text-xs text-slate-500">{text.verifier.rejectReasonHelp}</p>
              <textarea className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900" id="reject-reason" maxLength={reasonMaxLength + 100} onChange={(event) => setReason(event.target.value)} rows={3} value={reason} />
              <p className={`mt-1 text-xs ${reason.length > reasonMaxLength ? 'text-rose-700' : 'text-slate-500'}`}>{reason.length}/{reasonMaxLength} {text.report.characterCount}</p>
              <div className="mt-3 flex flex-wrap gap-3">
                <button className="rounded-lg bg-rose-700 px-4 py-3 text-sm font-semibold text-white hover:bg-rose-800 disabled:cursor-wait disabled:opacity-70" disabled={isBusy} type="submit">{busyAction === 'reject' ? text.verifier.rejecting : text.verifier.confirmReject}</button>
                <button className="rounded-lg border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 disabled:opacity-70" disabled={isBusy} onClick={() => { setIsRejecting(false); setActionError(null); }} type="button">{text.verifier.cancel}</button>
              </div>
            </form>
          ) : (
            <div className="mt-6 flex flex-wrap gap-3">
              <button className="rounded-lg bg-emerald-700 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-wait disabled:opacity-70" disabled={isBusy} onClick={() => decide('approve', { method: 'POST' })} type="button">{busyAction === 'approve' ? text.verifier.approving : text.verifier.approve}</button>
              <button className="rounded-lg border border-rose-700 px-4 py-3 text-sm font-semibold text-rose-800 hover:bg-rose-50 disabled:opacity-70" disabled={isBusy} onClick={() => setIsRejecting(true)} type="button">{text.verifier.reject}</button>
            </div>
          )}
          {actionError && <p className="mt-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">{actionError}</p>}
        </article>
      </section>
    </main>
  );
}
