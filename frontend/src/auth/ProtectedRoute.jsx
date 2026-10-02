import { useEffect } from 'react';
import { navigate } from '../routing.js';
import { text } from '../i18n/en.js';
import { useAuth } from './AuthContext.jsx';

function AccessNotice({ message }) {
  const { signOut } = useAuth();

  return (
    <main className="portal-page px-4 sm:px-6">
      <section className="portal-card portal-card--padded mx-auto max-w-lg">
        <h1 className="portal-section-title">{text.auth.accessTitle}</h1>
        <p className="portal-copy mt-2 text-sm">{message}</p>
        <button className="portal-button mt-5" onClick={() => signOut()} type="button">
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
