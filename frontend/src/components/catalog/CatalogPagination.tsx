import React from 'react';
import PremiumSelect from '../PremiumSelect';
import { PAGE_SIZE_OPTIONS } from '../../types/pagination';
import './CatalogRegistry.css';

type CatalogPaginationProps = {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  disabled?: boolean;
};

const CatalogPagination: React.FC<CatalogPaginationProps> = ({
  page,
  totalPages,
  total,
  limit,
  onPageChange,
  onLimitChange,
  disabled = false,
}) => {
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <footer className="catalog-pagination" aria-label="Paginação">
      <p className="catalog-pagination__summary">
        {total === 0 ? (
          'Nenhum registro'
        ) : (
          <>
            Exibindo <strong>{from}</strong>–<strong>{to}</strong> de <strong>{total}</strong>
          </>
        )}
      </p>

      <div className="catalog-pagination__controls">
        <PremiumSelect
          label="Por página"
          value={String(limit)}
          options={PAGE_SIZE_OPTIONS.map((n) => ({ value: String(n), label: String(n) }))}
          wrapperClassName="catalog-pagination__limit form-group"
          disabled={disabled}
          onChange={(v) => onLimitChange(Number(v))}
        />

        <div className="catalog-pagination__nav">
          <button
            type="button"
            className="catalog-action-button is-secondary"
            disabled={disabled || page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            Anterior
          </button>
          <span className="catalog-pagination__page">
            Página {page} de {totalPages}
          </span>
          <button
            type="button"
            className="catalog-action-button is-secondary"
            disabled={disabled || page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            Próxima
          </button>
        </div>
      </div>
    </footer>
  );
};

export default CatalogPagination;
