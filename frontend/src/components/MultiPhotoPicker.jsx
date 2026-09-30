import { useEffect, useMemo } from 'react';
import { text } from '../i18n/en.js';

export function MultiPhotoPicker({ files, maxFiles, onChange }) {
  const previews = useMemo(() => files.map((file) => URL.createObjectURL(file)), [files]);

  useEffect(() => () => previews.forEach((url) => URL.revokeObjectURL(url)), [previews]);

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
        capture="environment"
        className="mt-3 block w-full text-sm text-slate-700 file:mr-4 file:rounded-lg file:border-0 file:bg-cyan-100 file:px-4 file:py-2 file:font-semibold file:text-cyan-900 hover:file:bg-cyan-200 disabled:opacity-50"
        disabled={files.length >= maxFiles}
        id="action-photos"
        multiple
        onChange={addFiles}
        type="file"
      />
      <p className="mt-1 text-xs text-slate-500">{files.length}/{maxFiles} {text.actionReport.photosCount}</p>
      <ul className="mt-3 grid gap-3 sm:grid-cols-3">
        {files.map((file, index) => (
          <li className="rounded-xl border border-slate-200 p-2" key={`${file.name}-${index}`}>
            <img alt={text.actionReport.previewAlt} className="h-32 w-full rounded-lg object-cover" src={previews[index]} />
            <p className="mt-2 truncate text-xs text-slate-700">{file.name}</p>
            <button className="mt-1 text-xs font-semibold text-rose-700 hover:underline" onClick={() => onChange(files.filter((_, i) => i !== index))} type="button">{text.actionReport.removePhoto}</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
