import React from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Sidebar from './components/Common/Sidebar'; // Sidebar 컴포넌트

import DashboardPage from './pages/DashboardPage';
import PatientListPage from './pages/PatientListPage';
import PatientDicomPage from './pages/PatientDicomPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ViewerPage from './pages/ViewerPage';

/** ProtectedRoute: 인증된 사용자만 접근 */
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return isAuthenticated ? (
    children
  ) : (
    <Navigate to="/login" state={{ from: location }} replace />
  );
};

/** PublicRoute: 인증 안 된 사용자만 접근 */
const PublicRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return !isAuthenticated ? children : (
    <Navigate to="/dashboard" replace />
  );
};

/** AuthRedirector: 기타 경로에서 로그인/대시보드로 리디렉트 */
const AuthRedirector = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return isAuthenticated
    ? <Navigate to="/dashboard" replace />
    : <Navigate to="/login" replace />;
};

const AppInner = () => {
  const { user } = useAuth();

  return (
    // 최상위 컨테이너 배경을 흰색으로 강제 지정
    <div style={{ backgroundColor: '#ffffff' }}>
      
      {/* 헤더 */}
      <div
        style={{
          backgroundColor: '#343a40',
          color: 'white',
          padding: '10px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <h2 style={{ margin: 0 }}>StrokeCare+ 병원 시스템</h2>
      </div>

      <div style={{ display: 'flex', height: 'calc(100vh - 60px)' }}>
        {/* 사이드바 */}
        <Sidebar user={user} />

        {/* 메인 콘텐츠 */}
        <main
         style={{
           flexGrow: 1,
           overflowY: 'auto',
           backgroundColor: '#ffffff',  // 메인 영역 배경을 흰색으로
         }}
       >
          <Routes>
            {/* Public */}
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <LoginPage />
                </PublicRoute>
              }
            />
            <Route
              path="/signup"
              element={
                <PublicRoute>
                  <SignupPage />
                </PublicRoute>
              }
            />

            {/* Protected */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/patients"
              element={
                <ProtectedRoute>
                  <PatientListPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/patients/:uuid/dicom"
              element={
                <ProtectedRoute>
                  <PatientDicomPage />
                </ProtectedRoute>
              }
            />

            {/* ★ ViewerPage 경로 추가 ★ */}
            <Route
              path="/viewer/:studyUID"
              element={
                <ProtectedRoute>
                  <ViewerPage />
                </ProtectedRoute>
              }
            />

            {/* 그 외 */}
            <Route path="*" element={<AuthRedirector />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppInner />
      </AuthProvider>
    </Router>
  );
}

export default App;
