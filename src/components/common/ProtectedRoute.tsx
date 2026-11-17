import React from 'react';
import { Navigate } from 'react-router-dom';
import { PermissionAction, PermissionModule } from '../../types';
import { usePharmacyStore } from '../../store/usePharmacyStore';
import { AccessDeniedPage } from '../../pages/auth/AccessDeniedPage';
import { SessionExpiredPage } from '../../pages/auth/SessionExpiredPage';

interface ProtectedRouteProps {
  module?: PermissionModule;
  action?: PermissionAction;
  children: React.ReactNode;
}

export function ProtectedRoute({ module, action = 'view', children }: ProtectedRouteProps) {
  const session = usePharmacyStore((s) => s.session);
  const can = usePharmacyStore((s) => s.can);

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (session.sessionExpired) {
    return <SessionExpiredPage />;
  }

  if (module && !can(module, action)) {
    return <AccessDeniedPage requiredModule={module} />;
  }

  return <>{children}</>;
}
