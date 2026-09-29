import { useEffect } from 'react';
import { navigate } from '../routing.js';
import { text } from '../i18n/en.js';
import { useAuth } from './AuthContext.jsx';

function AccessNotice({ message }) {
  const { signOut } = useAuth();

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-slate-900 sm:px-6">
      <section className="mx-auto max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <h1 className="text-xl font-semibold text-slate-900">{text.auth.accessTitle}</h1>
        <p className="mt-2 text-sm text-slate-600">{message}</p>
        <button className="mt-5 rounded-lg bg-cyan-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-800" onClick={() => signOut()} type="button">
          {text.auth.logOut}
        </button>
      </section>
    </main>
  );
}

export function ProtectedRoute({ role, children }) {
  const { loading, session, profile, profileError, profileLoading } = useAuth();

  useEffect(() => {
    if (!loading && !session) {
      navigate('/login', { replace: true });
    }
  }, [loading, session]);

  if (loading || profileLoading) {
    return <p className="p-6 text-sm text-slate-600" role="status">{text.auth.loading}</p>;
  }

  if (!session) {
    return null;
  }

  if (profileError) {
    return <AccessNotice message={profileError.message || text.auth.accountUnavailable} />;
  }

  if (role && profile?.role !== role) {
    return <AccessNotice message={text.auth.roleUnavailable} />;
  }

  return children;
}
