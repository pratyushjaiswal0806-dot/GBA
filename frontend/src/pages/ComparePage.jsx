import { useEffect, useRef, useState } from 'react';
import { requestJson } from '../api/client.js';
import { SideBySide } from '../components/SideBySide.jsx';
import { text } from '../i18n/en.js';
import { AppLink } from '../components/AppLink.jsx';
import { navigate } from '../routing.js';

const reasonMaxLength = 500;

export function ComparePage({ ticketId }) {
  const [compare, setCompare] = useState({ state: 'loading', data: null, error: null });
  const [isRejecting, setIsRejecting] = useState(false);
  const [confirmingApprove, setConfirmingApprove] = useState(false);
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
      navigate('/verifier', { replace: true });
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

  const backButton = <AppLink className="portal-back-link" href="/verifier">← {text.verifier.backToQueue}</AppLink>;

  if (compare.state === 'loading') return <p className="portal-loading px-6" role="status">{text.verifier.compareLoading}</p>;
  if (compare.state === 'error') return <main className="portal-page px-4 sm:px-6"><section className="mx-auto max-w-5xl">{backButton}<div className="portal-card portal-card--padded mt-3"><p className="portal-alert" role="alert">{compare.error || text.api.networkError}</p><button className="portal-button mt-5" onClick={() => setReloadKey((current) => current + 1)} type="button">{text.verifier.retry}</button></div></section></main>;

  const { original, action, distanceMeters, farWarning } = compare.data;
  const isBusy = busyAction !== null;

  return (
    <main className="portal-page px-4 sm:px-6">
      <section className="mx-auto max-w-5xl">
        {backButton}
        <article className="portal-card portal-card--padded mt-3">
          <p className="portal-kicker">{text.verifier.queueTitle}</p>
          <h1 className="portal-title mt-2">{text.verifier.compareTitle}</h1>

          <div className={`portal-data mt-5 rounded border px-4 py-3 text-sm ${farWarning ? 'border-amber-300 bg-amber-50 text-amber-950' : 'border-slate-300 bg-slate-50 text-slate-800'}`} role={farWarning ? 'alert' : 'status'}>
            <p><span className="font-semibold">{text.verifier.distance}:</span> {distanceMeters === null ? text.verifier.distanceUnknown : `${distanceMeters} ${text.verifier.meters}`}</p>
            {farWarning && <p className="mt-1 font-semibold">{text.verifier.farWarning}</p>}
          </div>

          <div className="mt-5"><SideBySide action={action} original={original} /></div>

          <section className="mt-5">
            <h2 className="portal-field-label">{text.verifier.remarks}</h2>
            <p className="portal-copy mt-1 break-words whitespace-pre-wrap">{action.remarks}</p>
          </section>

          {isRejecting ? (
            <form className="mt-6" onSubmit={submitReject}>
              <label className="portal-field-label" htmlFor="reject-reason">{text.verifier.rejectReasonLabel}</label>
              <p className="mt-1 text-sm text-slate-600" id="reject-reason-help">{text.verifier.rejectReasonHelp}</p>
              <textarea aria-describedby="reject-reason-help reject-reason-count" autoComplete="off" className="portal-field mt-2 min-h-24" disabled={isBusy} id="reject-reason" maxLength={reasonMaxLength + 100} name="reason" onChange={(event) => setReason(event.target.value)} rows={3} value={reason} />
              <p className={`mt-1 text-sm ${reason.length > reasonMaxLength ? 'text-rose-700' : 'text-slate-600'}`} id="reject-reason-count">{reason.length}/{reasonMaxLength} {text.report.characterCount}</p>
              <div className="mt-3 flex flex-wrap gap-3">
                <button className="portal-button-danger" disabled={isBusy} type="submit">{busyAction === 'reject' ? text.verifier.rejecting : text.verifier.confirmReject}</button>
                <button className="portal-button-secondary" disabled={isBusy} onClick={() => { setIsRejecting(false); setActionError(null); }} type="button">{text.verifier.cancel}</button>
              </div>
            </form>
          ) : (
            <div className="action-bar mt-6 flex flex-wrap gap-3">
              {confirmingApprove ? (
                <div className="approval-confirm" role="group" aria-label={text.verifier.approvalConfirmLabel}>
                  <p className="font-semibold text-slate-900">{text.verifier.approvalConfirmPrompt}</p>
                  <div className="mt-3 flex flex-wrap gap-3">
                    <button className="portal-button-success" disabled={isBusy} onClick={() => decide('approve', { method: 'POST' })} type="button">{busyAction === 'approve' ? text.verifier.approving : text.verifier.confirmApprove}</button>
                    <button className="portal-button-secondary" disabled={isBusy} onClick={() => setConfirmingApprove(false)} type="button">{text.verifier.cancel}</button>
                  </div>
                </div>
              ) : (
                <>
                  <button className="portal-button-success" disabled={isBusy} onClick={() => setConfirmingApprove(true)} type="button">{text.verifier.approve}</button>
                  <button className="portal-button-danger" disabled={isBusy} onClick={() => setIsRejecting(true)} type="button">{text.verifier.reject}</button>
                </>
              )}
            </div>
          )}
          {actionError && <p className="portal-alert mt-4" role="alert">{actionError}</p>}
        </article>
      </section>
    </main>
  );
}
