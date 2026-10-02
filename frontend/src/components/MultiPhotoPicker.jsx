import { useEffect, useState } from 'react';
import { text } from '../i18n/en.js';

export function MultiPhotoPicker({ files, maxFiles, onChange, disabled = false, describedBy }) {
  const [previews, setPreviews] = useState([]);

  useEffect(() => {
    const nextPreviews = files.map((file) => URL.createObjectURL(file));
    setPreviews(nextPreviews);
    return () => nextPreviews.forEach((url) => URL.revokeObjectURL(url));
  }, [files]);

  function addFiles(event) {
    onChange([...files, ...Array.from(event.target.files ?? [])].slice(0, maxFiles));
    event.target.value = '';
  }

  return (
    <div>
      <label className="block text-sm font-semibold text-slate-800" htmlFor="action-photos">{text.actionReport.photosLabel}</label>
      <p className="mt-1 text-sm text-slate-500">{text.actionReport.photosHelp}</p>
      <input
        accept="image/jpeg,image/png"
        aria-describedby={describedBy}
        aria-invalid={Boolean(describedBy)}
        capture="environment"
        className="photo-input mt-3 block w-full text-sm text-slate-700"
        disabled={disabled || files.length >= maxFiles}
        id="action-photos"
        multiple
        name="photos"
        onChange={addFiles}
        type="file"
      />
      <p className="mt-1 text-xs text-slate-500">{files.length}/{maxFiles} {text.actionReport.photosCount}</p>
      <ul className="mt-3 grid gap-3 sm:grid-cols-3">
        {files.map((file, index) => (
          <li className="rounded-xl border border-slate-200 p-2" key={`${file.name}-${index}`}>
            <img alt={text.actionReport.previewAlt} className="h-32 w-full rounded-lg bg-slate-100 object-cover" height="160" loading="lazy" src={previews[index]} width="240" />
            <p className="mt-2 truncate text-xs text-slate-700">{file.name}</p>
            <button className="mt-2 min-h-9 text-sm font-semibold text-rose-700 underline-offset-2 hover:underline" disabled={disabled} onClick={() => onChange(files.filter((_, i) => i !== index))} type="button">{text.actionReport.removePhoto}<span className="sr-only"> {file.name}</span></button>
          </li>
        ))}
      </ul>
    </div>
  );
}
