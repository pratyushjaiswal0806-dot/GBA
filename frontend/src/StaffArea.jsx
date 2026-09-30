import { AuthProvider } from './auth/AuthContext.jsx';
import { ProtectedRoute } from './auth/ProtectedRoute.jsx';
import { ActionReportPage } from './pages/ActionReportPage.jsx';
import { OfficerTicketsPage } from './pages/OfficerTicketsPage.jsx';
import { TicketDetailPage } from './pages/TicketDetailPage.jsx';
import { LoginPage } from './pages/LoginPage.jsx';
import { ComparePage } from './pages/ComparePage.jsx';
import { VerifierQueuePage } from './pages/VerifierQueuePage.jsx';

function StaffAreaContent({ path }) {
  if (path === '/login') return <LoginPage />;
  if (path === '/officer') return <ProtectedRoute role="OFFICER"><OfficerTicketsPage /></ProtectedRoute>;
  const reportMatch = path.match(/^\/officer\/tickets\/(\d+)\/action-report$/);
  if (reportMatch) return <ProtectedRoute role="OFFICER"><ActionReportPage ticketId={reportMatch[1]} /></ProtectedRoute>;
  const ticketMatch = path.match(/^\/officer\/tickets\/(\d+)$/);
  if (ticketMatch) return <ProtectedRoute role="OFFICER"><TicketDetailPage ticketId={ticketMatch[1]} /></ProtectedRoute>;
  if (path === '/verifier') return <ProtectedRoute role="VERIFIER"><VerifierQueuePage /></ProtectedRoute>;
  const compareMatch = path.match(/^\/verifier\/tickets\/(\d+)$/);
  if (compareMatch) return <ProtectedRoute role="VERIFIER"><ComparePage ticketId={compareMatch[1]} /></ProtectedRoute>;
  return <LoginPage />;
}

export default function StaffArea({ path }) {
  return <AuthProvider><StaffAreaContent path={path} /></AuthProvider>;
}
