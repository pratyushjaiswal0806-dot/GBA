import { useEffect, useState } from 'react';
import { text } from '../i18n/en.js';
import { Icon } from './Icon.jsx';

export function PhotoPicker({ file, onChange, disabled = false, describedBy }) {
  const [previewUrl, setPreviewUrl] = useState(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return undefined;
    }

    const nextPreviewUrl = URL.createObjectURL(file);
    setPreviewUrl(nextPreviewUrl);

    return () => URL.revokeObjectURL(nextPreviewUrl);
  }, [file]);

  return (
    <div>
      <label className="portal-field-label" htmlFor="report-photo">
        {text.report.photoLabel}
      </label>
      <p className="portal-info mt-2">{text.report.photoHelp}</p>
      <div className="photo-drop">
        <span className="icon-chip"><Icon name="camera" /></span>
        <input
        accept="image/jpeg,image/png"
        aria-describedby={describedBy}
        aria-invalid={Boolean(describedBy)}
        capture="environment"
        className="photo-input block w-full text-sm text-slate-700"
        disabled={disabled}
        id="report-photo"
        name="photo"
        onChange={(event) => onChange(event.target.files?.[0] ?? null)}
        type="file"
      />
      </div>
      {file && (
        <div className="mt-3 rounded-xl border border-slate-300 p-3">
          <p className="break-words text-sm font-medium text-slate-900">{text.report.photoSelected}: {file.name}</p>
          {previewUrl && <img alt={text.report.photoPreviewAlt} className="mt-3 max-h-64 w-full rounded-lg bg-slate-100 object-contain" height="480" src={previewUrl} width="640" />}
        </div>
      )}
    </div>
  );
}
