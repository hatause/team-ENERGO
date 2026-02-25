import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './layouts/MainLayout';
import ActivitiesPage from './pages/ActivitiesPage';
import HistoryPage from './pages/HistoryPage';
import LoginPage from './pages/LoginPage';
import ResultPage from './pages/ResultPage';
import RoomsPage from './pages/RoomsPage';
import StudentDashboardPage from './pages/StudentDashboardPage';
import TestPage from './pages/TestPage';
import { useAuth } from './store/auth-store';

const HomeRedirect = () => {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <Navigate to="/student" replace />;
};

const App = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/student"
        element={
          <ProtectedRoute roles={['STUDENT']}>
            <MainLayout>
              <StudentDashboardPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/tests/:testId"
        element={
          <ProtectedRoute roles={['STUDENT']}>
            <MainLayout>
              <TestPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/results/:attemptId"
        element={
          <ProtectedRoute roles={['STUDENT']}>
            <MainLayout>
              <ResultPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/history"
        element={
          <ProtectedRoute roles={['STUDENT']}>
            <MainLayout>
              <HistoryPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/activities"
        element={
          <ProtectedRoute roles={['STUDENT']}>
            <MainLayout>
              <ActivitiesPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/rooms"
        element={
          <ProtectedRoute roles={['STUDENT']}>
            <MainLayout>
              <RoomsPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />

      <Route path="/" element={<HomeRedirect />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
