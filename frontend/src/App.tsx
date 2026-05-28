import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import PrivateRoute from './components/PrivateRoute';
import AppLayout from './components/AppLayout';
import Login from './pages/Login';
import RegisterOrganization from './pages/RegisterOrganization';
import { buildModuleRoutes } from './routes/appRoutes';
import './App.css';

function App(): React.ReactElement {
  return (
    <AuthProvider>
      <ToastProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/criar-organizacao" element={<RegisterOrganization />} />

          <Route
            element={
              <PrivateRoute>
                <AppLayout />
              </PrivateRoute>
            }
          >
            {buildModuleRoutes()}
          </Route>

          <Route path="/integracao/smartpos" element={<Navigate to="/" replace />} />
          <Route path="/users" element={<Navigate to="/usuarios" replace />} />
          <Route path="/reports" element={<Navigate to="/relatorios" replace />} />
          <Route path="/feedbacks/*" element={<Navigate to="/" replace />} />
          <Route path="/cycles" element={<Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
