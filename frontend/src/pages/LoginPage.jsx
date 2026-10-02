import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../auth/AuthContext.jsx';
import { text } from '../i18n/en.js';
import { navigate } from '../routing.js';
import { Icon } from '../components/Icon.jsx';

export function LoginPage() {
  const { loading, session, profile, profileError, profileLoading, signIn, signOut } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
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
      <main className="portal-page px-4 sm:px-6">
        <section className="portal-card portal-card--padded mx-auto max-w-lg">
          <h1 className="portal-section-title">{text.auth.accessTitle}</h1>
          <p className="portal-alert mt-3" role="alert">{profileError.message || text.auth.accountUnavailable}</p>
          <button className="portal-button mt-5" onClick={() => signOut()} type="button">
            {text.auth.logOut}
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="portal-page px-4 sm:px-6">
      <section className="portal-card portal-card--padded mx-auto max-w-lg">
        <span className="icon-chip auth-mark"><Icon name="lock" /></span>
        <h1 className="portal-title">{text.auth.title}</h1>
        <p className="portal-copy mt-2">{text.auth.description}</p>
        {sessionMessage && <p className="portal-notice mt-4" role="status">{sessionMessage}</p>}
        <form className="mt-6 space-y-5" onSubmit={submit}>
          <div>
            <label className="portal-field-label" htmlFor="staff-email">{text.auth.email}</label>
            <input autoComplete="username" className="portal-field mt-2" disabled={submitting} id="staff-email" name="email" onChange={(event) => setEmail(event.target.value)} required type="email" value={email} />
          </div>
          <div>
            <label className="portal-field-label" htmlFor="staff-password">{text.auth.password}</label>
            <div className="mt-2 flex gap-2">
              <input autoComplete="current-password" className="portal-field min-w-0" disabled={submitting} id="staff-password" name="password" onChange={(event) => setPassword(event.target.value)} required type={showPassword ? 'text' : 'password'} value={password} />
              <button aria-pressed={showPassword} className="portal-button-secondary shrink-0" onClick={() => setShowPassword((value) => !value)} type="button">{showPassword ? text.auth.hidePassword : text.auth.showPassword}</button>
            </div>
          </div>
          {error && <p className="portal-alert" role="alert">{error}</p>}
          <button className="portal-button w-full" disabled={submitting} type="submit">
            {submitting ? text.auth.signingIn : text.auth.signIn}
          </button>
        </form>
      </section>
    </main>
  );
}
