import { useState } from 'react';
import { text } from '../i18n/en.js';

export function TicketCode({ code }) {
  const [copyState, setCopyState] = useState('idle');

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      setCopyState('copied');
    } catch {
      setCopyState('failed');
    }
  }

  return (
    <div className="ticket-code">
      <p className="ticket-code__label">{text.report.ticketCode}</p>
      <p className="portal-data ticket-code__value">{code}</p>
      <button className="portal-button-secondary" onClick={copyCode} type="button">{text.report.copyCode}</button>
      <p className="ticket-code__feedback" role="status">
        {copyState === 'copied' ? text.report.codeCopied : copyState === 'failed' ? text.report.copyFailed : ''}
      </p>
    </div>
  );
}
