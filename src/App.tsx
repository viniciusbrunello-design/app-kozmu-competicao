import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { BottomNav } from './components/ui/BottomNav';
import { SideNav } from './components/ui/SideNav';

import { Home } from './pages/Home';
import { Grupos } from './pages/Grupos';
import { Desafios } from './pages/Desafios';
import { Ranking } from './pages/Ranking';
import { Perfil } from './pages/Perfil';
import { Registrar } from './pages/Registrar';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Onboarding } from './pages/Onboarding';
import { Notificacoes } from './pages/Notificacoes';
import { Historico } from './pages/Historico';
import { GrupoDetalhe } from './pages/GrupoDetalhe';
import { Configuracoes } from './pages/Configuracoes';

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mobile-container">
      <SideNav />
      {children}
      <BottomNav />
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-base)',
          color: 'var(--text-secondary)',
          fontSize: '0.875rem',
        }}
      >
        Carregando...
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicRoute>
            <Register />
          </PublicRoute>
        }
      />
      <Route
        path="/onboarding"
        element={
          <ProtectedRoute>
            <Onboarding />
          </ProtectedRoute>
        }
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout>
              <Home />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/grupos"
        element={
          <ProtectedRoute>
            <Layout>
              <Grupos />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/desafios"
        element={
          <ProtectedRoute>
            <Layout>
              <Desafios />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/ranking"
        element={
          <ProtectedRoute>
            <Layout>
              <Ranking />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/perfil"
        element={
          <ProtectedRoute>
            <Layout>
              <Perfil />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/registrar"
        element={
          <ProtectedRoute>
            <div className="mobile-container">
              <Registrar />
            </div>
          </ProtectedRoute>
        }
      />
      <Route
        path="/grupos/:id"
        element={
          <ProtectedRoute>
            <GrupoDetalhe />
          </ProtectedRoute>
        }
      />
      <Route
        path="/historico"
        element={
          <ProtectedRoute>
            <Historico />
          </ProtectedRoute>
        }
      />
      <Route
        path="/notificacoes"
        element={
          <ProtectedRoute>
            <Notificacoes />
          </ProtectedRoute>
        }
      />
      <Route
        path="/configuracoes"
        element={
          <ProtectedRoute>
            <Configuracoes />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
