import { AuthProvider } from './auth/AuthContext.jsx';
import { ProtectedRoute } from './auth/ProtectedRoute.jsx';
import { OfficerTicketsPage } from './pages/OfficerTicketsPage.jsx';
import { LoginPage } from './pages/LoginPage.jsx';
import { VerifierPendingPage } from './pages/VerifierPendingPage.jsx';

function StaffAreaContent({ path }) {
  if (path === '/login') return <LoginPage />;
  if (path === '/officer') return <ProtectedRoute role="OFFICER"><OfficerTicketsPage /></ProtectedRoute>;
  return <ProtectedRoute role="VERIFIER"><VerifierPendingPage /></ProtectedRoute>;
}

export default function StaffArea({ path }) {
  return <AuthProvider><StaffAreaContent path={path} /></AuthProvider>;
}
