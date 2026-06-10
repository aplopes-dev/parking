import React from 'react';
import './CatalogActiveToggle.css';

type CatalogActiveToggleProps = {
  checked: boolean;
  disabled?: boolean;
  label?: string;
  title?: string;
  onChange: (next: boolean) => void;
};

const CatalogActiveToggle: React.FC<CatalogActiveToggleProps> = ({
  checked,
  disabled = false,
  label,
  title,
  onChange,
}) => (
  <label
    className="catalog-active-toggle"
    title={title ?? (checked ? 'Desativar' : 'Ativar')}
    onClick={(e) => e.stopPropagation()}
    onKeyDown={(e) => e.stopPropagation()}
  >
    <input
      type="checkbox"
      checked={checked}
      disabled={disabled}
      onChange={(e) => onChange(e.target.checked)}
    />
    <span className="catalog-active-toggle__slider" aria-hidden />
    {label != null ? <span className="catalog-active-toggle__label">{label}</span> : null}
  </label>
);

export default CatalogActiveToggle;
