import { useEffect, useState } from 'react';
import { text } from '../i18n/en.js';

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
      <label className="block text-sm font-semibold text-slate-800" htmlFor="report-photo">
        {text.report.photoLabel}
      </label>
      <p className="mt-1 text-sm text-slate-500">{text.report.photoHelp}</p>
      <input
        accept="image/jpeg,image/png"
        aria-describedby={describedBy}
        aria-invalid={Boolean(describedBy)}
        capture="environment"
        className="photo-input mt-3 block w-full text-sm text-slate-700"
        disabled={disabled}
        id="report-photo"
        name="photo"
        onChange={(event) => onChange(event.target.files?.[0] ?? null)}
        type="file"
      />
      {file && (
        <div className="mt-3 rounded-xl border border-slate-200 p-3">
          <p className="break-words text-sm font-medium text-slate-800">{text.report.photoSelected}: {file.name}</p>
          {previewUrl && <img alt={text.report.photoPreviewAlt} className="mt-3 max-h-64 w-full rounded-lg bg-slate-100 object-contain" height="480" src={previewUrl} width="640" />}
        </div>
      )}
    </div>
  );
}
