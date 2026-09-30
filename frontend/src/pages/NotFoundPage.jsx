import { text } from '../i18n/en.js';
import { navigate } from '../routing.js';

export function NotFoundPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10 text-slate-900 sm:px-6">
      <section className="w-full max-w-lg rounded-2xl bg-white p-6 text-center shadow-xl sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-700">{text.app.eyebrow}</p>
        <h1 className="mt-3 text-2xl font-semibold text-slate-900">{text.notFound.title}</h1>
        <p className="mt-2 text-sm text-slate-600">{text.notFound.description}</p>
        <button className="mt-6 rounded-lg bg-cyan-700 px-4 py-3 text-sm font-semibold text-white hover:bg-cyan-800" onClick={() => navigate('/')} type="button">
          {text.notFound.backHome}
        </button>
      </section>
    </main>
  );
}
