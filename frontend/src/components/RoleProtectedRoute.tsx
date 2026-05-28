import React from 'react';
import { Navigate } from 'react-router-dom';
import { usePermissions } from '../hooks/usePermissions';
import { AppUserRole, getHomePathForRole } from '../types/userRole';
import './RoleProtectedRoute.css';

type RoleProtectedRouteProps = {
  children: React.ReactNode;
  /** Papéis autorizados; vazio = qualquer usuário autenticado. */
  allowedRoles?: readonly AppUserRole[];
};

const RoleProtectedRoute: React.FC<RoleProtectedRouteProps> = ({
  children,
  allowedRoles,
}) => {
  const { user, rawRole, canAccessRoute } = usePermissions();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles?.length && !canAccessRoute(allowedRoles)) {
    return <Navigate to={getHomePathForRole(rawRole)} replace />;
  }

  return <>{children}</>;
};

export default RoleProtectedRoute;
