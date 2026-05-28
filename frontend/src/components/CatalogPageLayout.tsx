import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { findModuleRootPath } from '../config/navigation';
import '../pages/catalog/Catalog.css';

export type CatalogPageLayoutProps = {
  moduleLabel: string;
  /** Primeira rota do módulo no menu (breadcrumb clicável). */
  modulePath?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  stats?: React.ReactNode;
  loading?: boolean;
  loadingDescription?: string;
  /** Cabeçalho reduzido: só breadcrumb + ações (sem título/descrição). */
  compactHeader?: boolean;
  className?: string;
  children?: React.ReactNode;
};

const CatalogPageLayout: React.FC<CatalogPageLayoutProps> = ({
  moduleLabel,
  modulePath,
  title,
  description,
  actions,
  stats,
  loading = false,
  loadingDescription,
  compactHeader = false,
  className = '',
  children,
}) => {
  const { pathname } = useLocation();
  const rootPath = modulePath ?? findModuleRootPath(moduleLabel);
  const showParentCrumb = Boolean(
    rootPath && (rootPath !== pathname || title !== moduleLabel),
  );

  const breadcrumb = (
    <nav className="catalog-breadcrumb" aria-label="Breadcrumb">
      {showParentCrumb ? (
        <>
          <Link to={rootPath!} className="catalog-breadcrumb__link">
            {moduleLabel}
          </Link>
          <span className="catalog-breadcrumb__sep" aria-hidden>
            /
          </span>
          <span className="catalog-breadcrumb__current">{title}</span>
        </>
      ) : (
        <span className="catalog-breadcrumb__current">{title}</span>
      )}
    </nav>
  );

  if (loading) {
    return (
      <div className={`catalog-state catalog-page catalog-page--ifood ${className}`.trim()}>
        <div className="catalog-state-card">
          {breadcrumb}
          <h1>{title}</h1>
          <p>{loadingDescription ?? 'Carregando…'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`catalog-page catalog-page--ifood ${className}`.trim()}>
      <header
        className={`catalog-page-header${compactHeader ? ' catalog-page-header--compact' : ''}`}
      >
        {breadcrumb}
        {compactHeader ? (
          actions ? (
            <div className="catalog-page-header__actions catalog-page-header__actions--compact">
              {actions}
            </div>
          ) : null
        ) : (
          <div className="catalog-page-header__row">
            <div className="catalog-page-header__copy">
              <h1>{title}</h1>
              {description ? <p>{description}</p> : null}
            </div>
            {actions ? <div className="catalog-page-header__actions">{actions}</div> : null}
          </div>
        )}
      </header>

      {stats}
      {children}
    </div>
  );
};

export default CatalogPageLayout;
