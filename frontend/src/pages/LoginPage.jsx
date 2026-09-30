import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../auth/AuthContext.jsx';
import { text } from '../i18n/en.js';
import { navigate } from '../routing.js';

export function LoginPage() {
  const { loading, session, profile, profileError, profileLoading, signIn, signOut } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const submitLock = useRef(false);
  const [sessionMessage] = useState(() => {
    const message = sessionStorage.getItem('gba-session-message');
    sessionStorage.removeItem('gba-session-message');
    return message;
  });

  useEffect(() => {
    if (profile) {
      navigate(profile.role === 'OFFICER' ? '/officer' : '/verifier', { replace: true });
    }
  }, [profile]);

  async function submit(event) {
    event.preventDefault();

    if (submitLock.current) return;

    if (!email.trim()) {
      setError(text.auth.emailRequired);
      return;
    }

    if (!password) {
      setError(text.auth.passwordRequired);
      return;
    }

    setError(null);
    submitLock.current = true;
    setSubmitting(true);

    try {
      const nextProfile = await signIn({ email: email.trim(), password });

      if (!nextProfile) {
        setError(text.auth.accountUnavailable);
      }
    } catch {
      setError(text.auth.invalidCredentials);
    } finally {
      submitLock.current = false;
      setSubmitting(false);
    }
  }

  if (loading || (session && profileLoading)) {
    return <p className="p-6 text-sm text-slate-600" role="status">{text.auth.loading}</p>;
  }

  if (session && profileError) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-10 sm:px-6">
        <section className="mx-auto max-w-lg rounded-2xl bg-white p-6 shadow-xl">
          <h1 className="text-xl font-semibold text-slate-900">{text.auth.accessTitle}</h1>
          <p className="mt-2 text-sm text-rose-700" role="alert">{profileError.message || text.auth.accountUnavailable}</p>
          <button className="mt-5 rounded-lg bg-cyan-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-800" onClick={() => signOut()} type="button">
            {text.auth.logOut}
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 sm:px-6">
      <section className="mx-auto max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-700">{text.app.eyebrow}</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">{text.auth.title}</h1>
        <p className="mt-2 text-sm text-slate-600">{text.auth.description}</p>
        {sessionMessage && <p className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900" role="status">{sessionMessage}</p>}
        <form className="mt-6 space-y-5" onSubmit={submit}>
          <div>
            <label className="block text-sm font-semibold text-slate-800" htmlFor="staff-email">{text.auth.email}</label>
            <input className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900" id="staff-email" onChange={(event) => setEmail(event.target.value)} type="email" value={email} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-800" htmlFor="staff-password">{text.auth.password}</label>
            <input className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900" id="staff-password" onChange={(event) => setPassword(event.target.value)} type="password" value={password} />
          </div>
          {error && <p className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">{error}</p>}
          <button className="w-full rounded-lg bg-cyan-700 px-4 py-3 text-sm font-semibold text-white hover:bg-cyan-800 disabled:cursor-wait disabled:opacity-70" disabled={submitting} type="submit">
            {submitting ? text.auth.signingIn : text.auth.signIn}
          </button>
        </form>
      </section>
    </main>
  );
}
