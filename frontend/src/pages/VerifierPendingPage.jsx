import { useAuth } from '../auth/AuthContext.jsx';
import { text } from '../i18n/en.js';

export function VerifierPendingPage() {
  const { profile, signOut } = useAuth();

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 sm:px-6">
      <section className="mx-auto max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <h1 className="text-xl font-semibold text-slate-900">{text.auth.verifierTitle}</h1>
        <p className="mt-2 text-sm text-slate-600">{text.auth.verifierDescription}</p>
        <p className="mt-4 text-sm font-medium text-slate-700">{profile.name}</p>
        <button className="mt-5 rounded-lg bg-cyan-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-800" onClick={() => signOut()} type="button">
          {text.auth.logOut}
        </button>
      </section>
    </main>
  );
}
