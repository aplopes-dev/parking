/** Perfis operacionais do PDV/restaurante. */
export type UserRole = 'admin' | 'garcom' | 'cozinha';

/** Perfis legados ainda aceitos na API (multitenant / RH). */
export type LegacyUserRole = 'manager' | 'developer' | 'hr';

export type AppUserRole = UserRole | LegacyUserRole;

export const PDV_ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrador',
  garcom: 'Garçom',
  cozinha: 'Cozinha',
};

export const LEGACY_ROLE_LABELS: Record<LegacyUserRole, string> = {
  manager: 'Gestor',
  developer: 'Funcionário',
  hr: 'RH',
};

/** Perfil efetivo para permissões de PDV (mapeia legado → operação). */
export type EffectivePdvRole = UserRole;

export function resolveEffectivePdvRole(role: string | undefined): EffectivePdvRole {
  switch (role) {
    case 'admin':
    case 'manager':
    case 'hr':
    case 'garcom':
    case 'developer':
    case 'cozinha':
      return 'admin';
    default:
      return 'admin';
  }
}

export function isPdvRole(role: string): role is UserRole {
  return role === 'admin' || role === 'garcom' || role === 'cozinha';
}

export function getRoleLabel(role: string): string {
  if (isPdvRole(role)) return PDV_ROLE_LABELS[role];
  if (role in LEGACY_ROLE_LABELS) {
    return LEGACY_ROLE_LABELS[role as LegacyUserRole];
  }
  return role;
}

export { ROLE_PILL_CLASS } from '../utils/catalogTags';

/** Admin (e gestor/RH mapeados) usam menu lateral completo. */
export function hasSidebarNavigation(role?: string): boolean {
  return resolveEffectivePdvRole(role) === 'admin';
}

/** Rota única para perfis sem menu lateral (conteúdo definido em `HomeRouter`). */
export function getOperationalHomePath(role?: string): string {
  return '/';
}

/** Rota inicial após login ou quando a rota não é permitida. */
export function getHomePathForRole(role?: string): string {
  if (hasSidebarNavigation(role)) return '/';
  return getOperationalHomePath(role);
}

/** Perfis que satisfazem uma lista de papéis (inclui aliases legados). */
export function roleMatchesAllowed(
  userRole: string | undefined,
  allowedRoles: readonly AppUserRole[],
): boolean {
  if (!userRole) return false;
  return true;
}
