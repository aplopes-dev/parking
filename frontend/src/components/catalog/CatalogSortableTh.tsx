import React from 'react';
import type { SortDirection } from '../../types/pagination';

type CatalogSortableThProps = {
  label: string;
  column: string;
  activeSortBy: string;
  activeSortOrder: SortDirection;
  onSort: (column: string) => void;
  align?: 'left' | 'center' | 'right';
};

const CatalogSortableTh: React.FC<CatalogSortableThProps> = ({
  label,
  column,
  activeSortBy,
  activeSortOrder,
  onSort,
  align = 'left',
}) => {
  const isActive = activeSortBy === column;
  const arrow = isActive ? (activeSortOrder === 'ASC' ? ' ↑' : ' ↓') : '';

  return (
    <button
      type="button"
      className={`catalog-sortable-th${isActive ? ' is-active' : ''}${
        align === 'right' ? ' catalog-sortable-th--right' : ''
      }${align === 'center' ? ' catalog-sortable-th--center' : ''}`}
      onClick={() => onSort(column)}
      aria-sort={
        isActive
          ? activeSortOrder === 'ASC'
            ? 'ascending'
            : 'descending'
          : 'none'
      }
    >
      {label}
      <span className="catalog-sortable-th__icon" aria-hidden>
        {arrow || ' ⇅'}
      </span>
    </button>
  );
};

export default CatalogSortableTh;
