import React from 'react';
import Skeleton from '../../../components/Skeleton';
import { formatMoney } from '../../pdv/pdvUtils';

type SmartPosStatsProps = {
  loading: boolean;
  open: number;
  free: number;
  revenue?: number;
  menuItemCount: number;
  compact?: boolean;
};

const SmartPosStats: React.FC<SmartPosStatsProps> = ({
  loading,
  open,
  free,
  revenue,
  menuItemCount,
  compact = false,
}) => {
  const skeletonCount = revenue !== undefined ? 4 : 3;

  return (
    <section
      className={`catalog-stats-grid smartpos-stats${compact ? ' smartpos-stats--compact' : ''}`}
      aria-label="Resumo do salão"
    >
      {loading ? (
        <>
          {Array.from({ length: skeletonCount }).map((_, i) => (
            <article key={i} className="catalog-stat-card smartpos-stat--skeleton">
              <Skeleton height={12} width="60%" />
              <span className="smartpos-stat-skeleton-value">
                <Skeleton height={28} width="40%" />
              </span>
            </article>
          ))}
        </>
      ) : (
        <>
          <article className="catalog-stat-card">
            <span>Mesas abertas</span>
            <strong>{open}</strong>
            <p>Sessões em andamento.</p>
          </article>
          <article className="catalog-stat-card">
            <span>Mesas livres</span>
            <strong>{free}</strong>
            <p>Disponíveis para abrir.</p>
          </article>
          {revenue !== undefined ? (
            <article className="catalog-stat-card">
              <span>Em consumo</span>
              <strong>{formatMoney(revenue)}</strong>
              <p>Total nas mesas abertas.</p>
            </article>
          ) : null}
          <article className="catalog-stat-card">
            <span>Cardápio</span>
            <strong>{menuItemCount}</strong>
            <p>Itens ativos no menu.</p>
          </article>
        </>
      )}
    </section>
  );
};

export default SmartPosStats;
