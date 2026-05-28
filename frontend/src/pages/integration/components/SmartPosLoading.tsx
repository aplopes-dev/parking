import React from 'react';
import CatalogPageLayout from '../../../components/CatalogPageLayout';
import Skeleton from '../../../components/Skeleton';

type SmartPosLoadingProps = {
  isDashboard: boolean;
};

/** Skeleton alinhado ao layout do painel — evita salto visual no bootstrap. */
const SmartPosLoading: React.FC<SmartPosLoadingProps> = ({ isDashboard }) => (
  <CatalogPageLayout
    className="smartpos-page smartpos-page--loading"
    moduleLabel="Início"
    title="Salão em tempo real"
    description="Carregando mapa de mesas e cardápio…"
  >
    <span className="visually-hidden" aria-busy="true">
      {isDashboard ? 'Painel geral' : 'SmartPOS'} — sincronizando mesas e cardápio
    </span>
    <section className="catalog-stats-grid smartpos-stats">
      {[1, 2, 3, 4].map((i) => (
        <article key={i} className="catalog-stat-card smartpos-stat--skeleton">
          <Skeleton height={12} width="55%" />
          <span className="smartpos-stat-skeleton-value">
            <Skeleton height={28} width="35%" />
          </span>
        </article>
      ))}
    </section>
    <div className="smartpos-layout">
      <section className="smartpos-floor">
        <div className="smartpos-floor-grid smartpos-floor-grid--skeleton">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="smartpos-table-card-skeleton">
              <Skeleton height={56} width={56} rounded />
              <Skeleton height={16} width="70%" />
              <Skeleton height={12} width="85%" />
            </div>
          ))}
        </div>
      </section>
      <aside className="smartpos-panel">
        <div className="smartpos-panel-block">
          <Skeleton height={20} width="50%" />
          <Skeleton height={14} width="80%" />
        </div>
      </aside>
    </div>
  </CatalogPageLayout>
);

export default SmartPosLoading;
