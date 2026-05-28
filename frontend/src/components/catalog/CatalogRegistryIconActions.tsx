import React from 'react';

type CatalogRegistryIconActionsProps = {
  editLabel: string;
  deleteLabel: string;
  onEdit: () => void;
  onDelete: () => void;
  disabled?: boolean;
};

const CatalogRegistryIconActions: React.FC<CatalogRegistryIconActionsProps> = ({
  editLabel,
  deleteLabel,
  onEdit,
  onDelete,
  disabled = false,
}) => (
  <div className="catalog-registry-actions">
    <button
      type="button"
      className="catalog-registry-icon-btn catalog-registry-icon-btn--edit"
      onClick={onEdit}
      disabled={disabled}
      aria-label={editLabel}
      title="Editar"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
    <button
      type="button"
      className="catalog-registry-icon-btn catalog-registry-icon-btn--delete"
      onClick={onDelete}
      disabled={disabled}
      aria-label={deleteLabel}
      title="Excluir"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M10 11v6M14 11v6"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </button>
  </div>
);

export default CatalogRegistryIconActions;
