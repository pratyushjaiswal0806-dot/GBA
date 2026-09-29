import { AuthProvider } from './auth/AuthContext.jsx';
import { ProtectedRoute } from './auth/ProtectedRoute.jsx';
import { OfficerTicketsPage } from './pages/OfficerTicketsPage.jsx';
import { TicketDetailPage } from './pages/TicketDetailPage.jsx';
import { LoginPage } from './pages/LoginPage.jsx';
import { VerifierPendingPage } from './pages/VerifierPendingPage.jsx';

function StaffAreaContent({ path }) {
  if (path === '/login') return <LoginPage />;
  if (path === '/officer') return <ProtectedRoute role="OFFICER"><OfficerTicketsPage /></ProtectedRoute>;
  const ticketMatch = path.match(/^\/officer\/tickets\/(\d+)$/);
  if (ticketMatch) return <ProtectedRoute role="OFFICER"><TicketDetailPage ticketId={ticketMatch[1]} /></ProtectedRoute>;
  if (path === '/verifier') return <ProtectedRoute role="VERIFIER"><VerifierPendingPage /></ProtectedRoute>;
  return <LoginPage />;
}

export default function StaffArea({ path }) {
  return <AuthProvider><StaffAreaContent path={path} /></AuthProvider>;
}
