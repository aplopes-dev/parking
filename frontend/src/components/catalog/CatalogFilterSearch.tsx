import React from 'react';

type CatalogFilterSearchProps = {
  id: string;
  label?: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  className?: string;
};

const CatalogFilterSearch: React.FC<CatalogFilterSearchProps> = ({
  id,
  label = 'Buscar',
  value,
  placeholder,
  onChange,
  onSubmit,
  className = '',
}) => (
  <div className={`form-group catalog-filter-search ${className}`.trim()}>
    <label htmlFor={id}>{label}</label>
    <div className="catalog-filter-search__field">
      <input
        id={id}
        className="premium-text-input catalog-filter-search__input"
        type="text"
        role="searchbox"
        enterKeyHint="search"
        autoComplete="off"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onSubmit?.();
        }}
      />
      {value ? (
        <button
          type="button"
          className="catalog-filter-search__clear"
          onClick={() => onChange('')}
          aria-label="Limpar busca"
          title="Limpar busca"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      ) : null}
    </div>
  </div>
);

export default CatalogFilterSearch;
