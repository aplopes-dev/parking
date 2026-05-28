import React, { useContext, useEffect, useMemo } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import { APP_BRAND, findRouteMeta } from '../config/navigation';
import {
  getHomePathForRole,
  getOperationalHomePath,
  getRoleLabel,
  hasSidebarNavigation,
} from '../types/userRole';
import { getUserPhotoUrl } from '../utils/userPhoto';
import { usePermissions } from '../hooks/usePermissions';
import AppSidebar from './AppSidebar';
import AppTopbarStoreSwitch from './AppTopbarStoreSwitch';
import AssistantWidget from './AssistantWidget';
import './Layout.css';

interface LayoutProps {
  children: React.ReactNode;
}

const PANEL_HOME_PATH = '/';

function TopbarHomeButton({ className = '' }: { className?: string }) {
  return (
    <NavLink
      to={PANEL_HOME_PATH}
      end
      className={({ isActive }) =>
        `app-topbar-home-btn${isActive ? ' is-active' : ''}${className ? ` ${className}` : ''}`
      }
      aria-label="Painel geral"
      title="Painel geral"
    >
      <svg
        className="app-topbar-home-icon"
        viewBox="0 0 24 24"
        width="17"
        height="17"
        fill="none"
        aria-hidden
        focusable="false"
      >
        <path
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4 11.4 12 4l8 7.4V20a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z"
        />
      </svg>
      <span className="app-topbar-home-label">Painel</span>
    </NavLink>
  );
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const auth = useContext(AuthContext);
  const { user, logout } = auth || {};
  const { isAdmin, isCozinha } = usePermissions();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);

  const showSidebar = hasSidebarNavigation(user?.role);
  const homePath = getOperationalHomePath(user?.role);

  useEffect(() => {
    if (showSidebar) return;
    if (location.pathname !== homePath) {
      navigate(homePath, { replace: true });
    }
  }, [showSidebar, location.pathname, homePath, navigate]);

  const userInitials = useMemo(() => {
    if (!user?.name) return 'F';
    return user.name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part: string) => part[0]?.toUpperCase())
      .join('');
  }, [user?.name]);

  const roleLabel = useMemo(
    () => (user?.role ? getRoleLabel(user.role) : 'Equipe'),
    [user?.role],
  );

  const focusedScreenLabel = isCozinha ? 'Cozinha' : 'Atendimento';

  const userPhotoUrl = useMemo(() => getUserPhotoUrl(user), [user]);
  const routeMeta = useMemo(() => findRouteMeta(location.pathname), [location.pathname]);
  const year = new Date().getFullYear();

  const handleLogout = (): void => {
    if (logout) {
      logout();
      navigate('/login');
    }
  };

  if (!showSidebar) {
    return (
      <div className="layout-shell layout-shell--focused">
        <header className="focused-topbar">
          <Link
            to={homePath}
            className="focused-topbar-brand"
            aria-label={`${APP_BRAND.name} — ${focusedScreenLabel}`}
          >
            <span className="focused-topbar-brand-mark" aria-hidden>
              {APP_BRAND.shortName.charAt(0)}
            </span>
            <div className="focused-topbar-brand-text">
              <strong>{APP_BRAND.name}</strong>
              <small>{focusedScreenLabel}</small>
            </div>
          </Link>

          <div className="focused-topbar-user">
            <TopbarHomeButton />
            <span className="focused-topbar-user-name">{user?.name}</span>
            <span className="focused-topbar-user-role">
              <span className="catalog-pill is-role catalog-pill--sm">{roleLabel}</span>
            </span>
            <button type="button" className="app-topbar-logout" onClick={handleLogout}>
              Sair
            </button>
          </div>
        </header>

        <main className="focused-main">
          <div className="focused-main-inner">{children}</div>
        </main>
      </div>
    );
  }

  return (
    <div className="layout-shell layout-shell--sidebar">
      <AppSidebar mobileOpen={mobileNavOpen} onCloseMobile={() => setMobileNavOpen(false)} />

      <div className="layout-main-column">
        <header className="app-topbar">
          <button
            type="button"
            className="app-topbar-menu-btn"
            aria-label="Abrir menu"
            aria-expanded={mobileNavOpen}
            onClick={() => setMobileNavOpen(true)}
          >
            <span aria-hidden />
            <span aria-hidden />
            <span aria-hidden />
          </button>

          <div className="app-topbar-breadcrumb">
            <span className="app-topbar-module">{routeMeta?.moduleLabel ?? APP_BRAND.name}</span>
            <strong>{routeMeta?.label ?? 'Painel'}</strong>
          </div>

          <div className="app-topbar-user">
            <TopbarHomeButton />
            <AppTopbarStoreSwitch />
            <Link
              to={isAdmin ? '/usuarios' : getHomePathForRole(user?.role)}
              className="app-topbar-user-link"
            >
              {userPhotoUrl ? (
                <img src={userPhotoUrl} alt="" className="app-topbar-avatar-image" />
              ) : (
                <span className="app-topbar-avatar" aria-hidden>
                  {userInitials}
                </span>
              )}
              <span className="app-topbar-user-text">
                <strong>{user?.name}</strong>
                <small>{roleLabel}</small>
              </span>
            </Link>
            <button type="button" className="app-topbar-logout" onClick={handleLogout}>
              Sair
            </button>
          </div>
        </header>

        <main className="app-main app-main--sidebar">
          <div className="app-main-inner">{children}</div>
        </main>

        <footer className="app-footer app-footer--sidebar">
          <p>
            © {year} {APP_BRAND.name} · {user?.tenant?.name ?? 'Multitenant'}
          </p>
        </footer>
      </div>

      <AssistantWidget />
    </div>
  );
};

export default Layout;
