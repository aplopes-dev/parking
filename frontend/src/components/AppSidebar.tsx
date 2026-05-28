import React, { useContext, useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import {
  APP_BRAND,
  NavItem,
  NavModule,
  getNavigationForRole,
} from '../config/navigation';
import './AppSidebar.css';

type AppSidebarProps = {
  mobileOpen: boolean;
  onCloseMobile: () => void;
};

function pathMatches(pathname: string, target: string): boolean {
  if (target === '/') return pathname === '/';
  return pathname === target || pathname.startsWith(`${target}/`);
}

/** Evita que /financeiro (etc.) fique ativo em rotas filhas do mesmo grupo. */
function hasChildPathAmongSiblings(path: string, siblings: NavItem[]): boolean {
  return siblings.some(
    (sibling) =>
      sibling.type === 'leaf' &&
      sibling.path !== path &&
      sibling.path.startsWith(`${path}/`),
  );
}

function subtreeActive(pathname: string, item: NavItem): boolean {
  if (item.type === 'leaf') return pathMatches(pathname, item.path);
  return item.children.some((child) => subtreeActive(pathname, child));
}

const NavTree: React.FC<{
  items: NavItem[];
  depth?: number;
  pathname: string;
  onNavigate?: () => void;
}> = ({ items, depth = 0, pathname, onNavigate }) => (
  <ul className={`app-sidebar-tree app-sidebar-tree--depth-${depth}`}>
    {items.map((item) => {
      if (item.type === 'leaf') {
        const exactMatch =
          item.path === '/' || hasChildPathAmongSiblings(item.path, items);
        return (
          <li key={item.id}>
            <NavLink
              to={item.path}
              end={exactMatch}
              className={({ isActive }) =>
                `app-sidebar-link app-sidebar-link--leaf${isActive ? ' is-active' : ''}`
              }
              onClick={onNavigate}
            >
              {item.label}
            </NavLink>
          </li>
        );
      }

      const open = subtreeActive(pathname, item);
      return (
        <li key={item.id} className={`app-sidebar-group${open ? ' is-open' : ''}`}>
          <span className="app-sidebar-group-label">{item.label}</span>
          <NavTree items={item.children} depth={depth + 1} pathname={pathname} onNavigate={onNavigate} />
        </li>
      );
    })}
  </ul>
);

const ModuleSection: React.FC<{
  module: NavModule;
  pathname: string;
  defaultOpen: boolean;
  onNavigate?: () => void;
}> = ({ module, pathname, defaultOpen, onNavigate }) => {
  const moduleActive = module.children.some((c) => subtreeActive(pathname, c));
  const [open, setOpen] = useState(defaultOpen || moduleActive);

  useEffect(() => {
    if (moduleActive) setOpen(true);
  }, [moduleActive, pathname]);

  if (module.id === 'dashboard') {
    return (
      <div className="app-sidebar-module app-sidebar-module--flat">
        <NavTree items={module.children} pathname={pathname} onNavigate={onNavigate} />
      </div>
    );
  }

  return (
    <div className={`app-sidebar-module${open ? ' is-open' : ''}`}>
      <button
        type="button"
        className="app-sidebar-module-trigger"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="app-sidebar-module-icon" aria-hidden>
          {module.icon}
        </span>
        <span className="app-sidebar-module-label">{module.label}</span>
        <span className="app-sidebar-module-chevron" aria-hidden />
      </button>
      {open ? (
        <div className="app-sidebar-module-body">
          <NavTree items={module.children} pathname={pathname} onNavigate={onNavigate} />
        </div>
      ) : null}
    </div>
  );
};

const AppSidebar: React.FC<AppSidebarProps> = ({ mobileOpen, onCloseMobile }) => {
  const authContext = useContext(AuthContext);
  const { user } = authContext || {};
  const location = useLocation();

  const modules = useMemo(() => getNavigationForRole(user?.role), [user?.role]);

  return (
    <>
      <div
        className={`app-sidebar-backdrop${mobileOpen ? ' is-visible' : ''}`}
        aria-hidden={!mobileOpen}
        onClick={onCloseMobile}
      />
      <aside className={`app-sidebar${mobileOpen ? ' is-mobile-open' : ''}`} aria-label="Menu principal">
        <div className="app-sidebar-brand">
          <span className="app-sidebar-brand-mark">{APP_BRAND.shortName.charAt(0)}</span>
          <div>
            <strong>{APP_BRAND.name}</strong>
            <small>{user?.tenant?.name ?? APP_BRAND.tagline}</small>
          </div>
        </div>

        <nav className="app-sidebar-nav">
          {modules.map((mod) => (
            <ModuleSection
              key={mod.id}
              module={mod}
              pathname={location.pathname}
              defaultOpen={mod.id === 'dashboard'}
              onNavigate={onCloseMobile}
            />
          ))}
        </nav>
      </aside>
    </>
  );
};

export default AppSidebar;
