import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useUserStore } from './store/userStore';
import LobbyPage from './pages/LobbyPage';
import CockpitPage from './pages/CockpitPage';
import AudiencePage from './pages/AudiencePage';
import AdminPage from './pages/AdminPage';
import StudentLoginPage from './pages/StudentLoginPage';
import StudentRegisterPage from './pages/StudentRegisterPage';
import StudentDashboardPage from './pages/StudentDashboardPage';
import PracticeCockpitPage from './pages/PracticeCockpitPage';

function RequireAlias({ children }: { children: React.ReactNode }) {
  const alias = useUserStore((s) => s.alias);
  return alias ? <>{children}</> : <Navigate to="/" replace />;
}

// Admin auth is handled within AdminPage itself via login form

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LobbyPage />} />
        <Route path="/student/login" element={<StudentLoginPage />} />
        <Route path="/student/register" element={<StudentRegisterPage />} />
        <Route path="/student/dashboard" element={<StudentDashboardPage />} />
        <Route path="/student/practice/:id" element={<PracticeCockpitPage />} />
        <Route
          path="/cockpit"
          element={
            <RequireAlias>
              <CockpitPage />
            </RequireAlias>
          }
        />
        <Route path="/audience" element={<AudiencePage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
