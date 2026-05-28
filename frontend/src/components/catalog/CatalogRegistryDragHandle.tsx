import React from 'react';

type CatalogRegistryDragHandleProps = {
  label: string;
  draggable: boolean;
  disabled?: boolean;
  onDragStart: () => void;
};

const CatalogRegistryDragHandle: React.FC<CatalogRegistryDragHandleProps> = ({
  label,
  draggable,
  disabled = false,
  onDragStart,
}) => (
  <button
    type="button"
    className="catalog-registry-drag"
    draggable={draggable && !disabled}
    onDragStart={onDragStart}
    disabled={disabled}
    aria-label={label}
    title={disabled ? 'Reordenar indisponível' : 'Arrastar para reordenar'}
  >
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <circle cx="5" cy="4" r="1.25" />
      <circle cx="11" cy="4" r="1.25" />
      <circle cx="5" cy="8" r="1.25" />
      <circle cx="11" cy="8" r="1.25" />
      <circle cx="5" cy="12" r="1.25" />
      <circle cx="11" cy="12" r="1.25" />
    </svg>
  </button>
);

export default CatalogRegistryDragHandle;
