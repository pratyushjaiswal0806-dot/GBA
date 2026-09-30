import { useEffect, useState } from 'react';
import { text } from '../i18n/en.js';

export function PhotoPicker({ file, onChange }) {
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
        capture="environment"
        className="mt-3 block w-full text-sm text-slate-700 file:mr-4 file:rounded-lg file:border-0 file:bg-cyan-100 file:px-4 file:py-2 file:font-semibold file:text-cyan-900 hover:file:bg-cyan-200"
        id="report-photo"
        onChange={(event) => onChange(event.target.files?.[0] ?? null)}
        type="file"
      />
      {file && (
        <div className="mt-3 rounded-xl border border-slate-200 p-3">
          <p className="text-sm font-medium text-slate-800">{text.report.photoSelected}: {file.name}</p>
          {previewUrl && <img alt={text.report.photoPreviewAlt} className="mt-3 max-h-64 w-full rounded-lg object-cover" src={previewUrl} />}
        </div>
      )}
    </div>
  );
}
