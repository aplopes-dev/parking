import { useContext, useMemo } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import {
  AppUserRole,
  EffectivePdvRole,
  resolveEffectivePdvRole,
  roleMatchesAllowed,
  UserRole,
} from '../types/userRole';

export type SmartPosPermissions = {
  canOpenTable: boolean;
  canAddItem: boolean;
  canRemoveItem: boolean;
  canSendToProduction: boolean;
  canRequestCloseAccount: boolean;
  canPrintReceipt: boolean;
  canRegisterPayment: boolean;
  canFreeTable: boolean;
  closeAccountLabel: string;
};

function buildSmartPosPermissions(pdvRole: EffectivePdvRole): SmartPosPermissions {
  if (pdvRole === 'garcom') {
    return {
      canOpenTable: true,
      canAddItem: true,
      canRemoveItem: true,
      canSendToProduction: true,
      canRequestCloseAccount: true,
      canPrintReceipt: false,
      canRegisterPayment: false,
      canFreeTable: false,
      closeAccountLabel: 'Solicitar encerramento de conta',
    };
  }

  if (pdvRole === 'admin') {
    return {
      canOpenTable: true,
      canAddItem: true,
      canRemoveItem: true,
      canSendToProduction: true,
      canRequestCloseAccount: true,
      canPrintReceipt: true,
      canRegisterPayment: true,
      canFreeTable: true,
      closeAccountLabel: 'Encerrar conta',
    };
  }

  return {
    canOpenTable: false,
    canAddItem: false,
    canRemoveItem: false,
    canSendToProduction: false,
    canRequestCloseAccount: false,
    canPrintReceipt: false,
    canRegisterPayment: false,
    canFreeTable: false,
    closeAccountLabel: 'Encerrar conta',
  };
}

export function usePermissions() {
  const auth = useContext(AuthContext);
  const user = auth?.user;
  const rawRole = user?.role;

  const pdvRole = useMemo(
    () => resolveEffectivePdvRole(rawRole),
    [rawRole],
  );

  const isAdmin = pdvRole === 'admin';
  const isGarcom = pdvRole === 'garcom';
  const isCozinha = pdvRole === 'cozinha';

  const smartPos = useMemo(() => buildSmartPosPermissions(pdvRole), [pdvRole]);

  const hasRole = (roles: readonly AppUserRole[]): boolean =>
    roleMatchesAllowed(rawRole, roles);

  const canAccessRoute = (allowedRoles?: readonly AppUserRole[]): boolean => {
    if (!allowedRoles?.length) return true;
    return hasRole(allowedRoles);
  };

  return {
    user,
    rawRole,
    pdvRole,
    isAdmin,
    isGarcom,
    isCozinha,
    smartPos,
    hasRole,
    canAccessRoute,
  };
}

export type { UserRole };
