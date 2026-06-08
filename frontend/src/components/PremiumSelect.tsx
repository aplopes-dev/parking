import React, { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './SearchableSelect.css';

export interface PremiumSelectOption {
  value: string;
  label: string;
}

type MenuPosition = {
  top?: number;
  bottom?: number;
  left: number;
  width: number;
  optionsMaxHeight: number;
};

const MENU_PORTAL_Z_INDEX = 1300;
const MENU_GAP = 6;
const MENU_MAX_HEIGHT = 280;

function computeMenuPosition(triggerEl: HTMLElement): MenuPosition {
  const rect = triggerEl.getBoundingClientRect();
  const spaceBelow = window.innerHeight - rect.bottom - MENU_GAP;
  const spaceAbove = rect.top - MENU_GAP;
  const openUp = spaceBelow < 160 && spaceAbove > spaceBelow;
  const available = openUp ? spaceAbove : spaceBelow;
  const optionsMaxHeight = Math.min(MENU_MAX_HEIGHT, Math.max(100, available - 12));

  if (openUp) {
    return {
      bottom: window.innerHeight - rect.top + MENU_GAP,
      left: rect.left,
      width: rect.width,
      optionsMaxHeight,
    };
  }

  return {
    top: rect.bottom + MENU_GAP,
    left: rect.left,
    width: rect.width,
    optionsMaxHeight,
  };
}

interface PremiumSelectProps {
  id?: string;
  label: string;
  value: string;
  options: PremiumSelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  wrapperClassName?: string;
  inputClassName?: string;
  /** Renderiza a lista no body (evita corte em modais com overflow). */
  menuInPortal?: boolean;
}

const PremiumSelect: React.FC<PremiumSelectProps> = ({
  id,
  label,
  value,
  options,
  onChange,
  placeholder = 'Selecione...',
  required,
  disabled = false,
  wrapperClassName = 'form-group',
  inputClassName = '',
  menuInPortal = false,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [menuPos, setMenuPos] = useState<MenuPosition | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const generatedId = useId().replace(/:/g, '');
  const controlId = id || `premium-select-${generatedId}`;
  const labelId = `${controlId}-label`;
  const listboxId = `${controlId}-listbox`;

  const updateMenuPosition = useCallback(() => {
    if (!triggerRef.current) return;
    setMenuPos(computeMenuPosition(triggerRef.current));
  }, []);

  useEffect(() => {
    if (disabled) {
      setIsOpen(false);
    }
  }, [disabled]);

  const selectedOption = useMemo(
    () => options.find((option) => option.value === value),
    [options, value],
  );

  useLayoutEffect(() => {
    const usePortal = menuInPortal || Boolean(triggerRef.current?.closest('.app-modal'));
    if (!isOpen || !usePortal) {
      setMenuPos(null);
      return;
    }
    updateMenuPosition();
    const onReflow = () => updateMenuPosition();
    window.addEventListener('resize', onReflow);
    window.addEventListener('scroll', onReflow, true);
    return () => {
      window.removeEventListener('resize', onReflow);
      window.removeEventListener('scroll', onReflow, true);
    };
  }, [isOpen, menuInPortal, updateMenuPosition, options.length]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (wrapperRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setIsOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (nextValue: string): void => {
    if (disabled) return;
    onChange(nextValue);
    setIsOpen(false);
  };

  const toggleOpen = (): void => {
    if (disabled) return;
    setIsOpen((open) => {
      const next = !open;
      const usePortal = menuInPortal || Boolean(triggerRef.current?.closest('.app-modal'));
      if (next && usePortal && triggerRef.current) {
        setMenuPos(computeMenuPosition(triggerRef.current));
      }
      return next;
    });
  };

  const inModal = Boolean(triggerRef.current?.closest('.app-modal'));
  const portalActive = menuInPortal || inModal;

  const dropdown =
    isOpen && (!portalActive || menuPos) ? (
      <div
        ref={menuRef}
        className={`searchable-select-dropdown premium-select-dropdown${
          portalActive ? ' searchable-select-dropdown--portal' : ''
        }${inModal ? ' searchable-select-dropdown--modal' : ''}`}
        style={
          portalActive && menuPos
            ? {
                position: 'fixed',
                left: menuPos.left,
                width: menuPos.width,
                top: menuPos.top,
                bottom: menuPos.bottom,
                zIndex: MENU_PORTAL_Z_INDEX,
              }
            : undefined
        }
      >
        <div
          className="searchable-select-options"
          id={listboxId}
          role="listbox"
          aria-labelledby={labelId}
          style={portalActive && menuPos ? { maxHeight: menuPos.optionsMaxHeight } : undefined}
        >
          {options.map((option) => (
            <div
              key={option.value}
              className={`searchable-select-option ${value === option.value ? 'selected' : ''}`}
              onClick={() => handleSelect(option.value)}
              role="option"
              aria-selected={value === option.value}
            >
              <div className="option-name">{option.label}</div>
            </div>
          ))}
        </div>
      </div>
    ) : null;

  return (
    <div className={wrapperClassName}>
      <label id={labelId}>
        {label} {required && '*'}
      </label>
      <div
        className={`searchable-select-wrapper premium-select${isOpen ? ' is-open' : ''}${
          disabled ? ' is-disabled' : ''
        }`}
        ref={wrapperRef}
      >
        <div
          ref={triggerRef}
          id={controlId}
          className={`searchable-select-input${inputClassName ? ` ${inputClassName}` : ''}`}
          onClick={toggleOpen}
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-controls={listboxId}
          aria-labelledby={labelId}
          aria-required={required}
          aria-disabled={disabled}
          tabIndex={disabled ? -1 : 0}
          onKeyDown={(event) => {
            if (disabled) return;
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              toggleOpen();
            }

            if (event.key === 'Escape') {
              setIsOpen(false);
            }
          }}
        >
          {selectedOption ? (
            <span className="searchable-select-value">{selectedOption.label}</span>
          ) : (
            <span className="placeholder">{placeholder}</span>
          )}
          <span className="arrow" aria-hidden>
            {isOpen ? '▲' : '▼'}
          </span>
        </div>

        {dropdown &&
          (portalActive && typeof document !== 'undefined'
            ? createPortal(dropdown, document.body)
            : dropdown)}
      </div>
    </div>
  );
};

export default PremiumSelect;
