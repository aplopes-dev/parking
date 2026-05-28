import React, { useState, useRef, useEffect } from 'react';
import './SearchableSelect.css';
import { User } from '../types';

interface SearchableSelectProps {
  options: User[];
  value: string;
  onChange: (event: { target: { name: string; value: string } }) => void;
  placeholder?: string;
  label: string;
  required?: boolean;
  wrapperClassName?: string;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onChange,
  placeholder,
  label,
  required,
  wrapperClassName = 'form-group',
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filteredOptions, setFilteredOptions] = useState<User[]>(options);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const filtered = options.filter((option) =>
      option.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      option.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredOptions(filtered);
  }, [searchTerm, options]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const selectedOption = options.find((opt) => opt.id === value);

  const handleSelect = (option: User): void => {
    onChange({ target: { name: 'managerId', value: option.id } });
    setSearchTerm('');
    setIsOpen(false);
  };

  return (
    <div className={wrapperClassName}>
      <label>
        {label} {required && '*'}
      </label>
      <div
        className={`searchable-select-wrapper premium-select${isOpen ? ' is-open' : ''}`}
        ref={wrapperRef}
      >
        <div
          className={`searchable-select-input${isOpen ? ' is-open' : ''}`}
          onClick={() => setIsOpen(!isOpen)}
        >
          {selectedOption ? (
            <span>{selectedOption.name} {selectedOption.email && `(${selectedOption.email})`}</span>
          ) : (
            <span className="placeholder">{placeholder}</span>
          )}
          <span className="arrow" aria-hidden="true" />
        </div>
        {isOpen && (
          <div className="searchable-select-dropdown">
            <input
              type="text"
              className="searchable-select-search"
              placeholder="Buscar por nome ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              autoFocus
            />
            <div className="searchable-select-options">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option) => (
                  <div
                    key={option.id}
                    className={`searchable-select-option ${value === option.id ? 'selected' : ''}`}
                    onClick={() => handleSelect(option)}
                  >
                    <div className="option-name">{option.name}</div>
                    {option.email && <div className="option-email">{option.email}</div>}
                    {option.role && <div className="option-role">{option.role}</div>}
                  </div>
                ))
              ) : (
                <div className="searchable-select-no-results">Nenhum resultado encontrado</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchableSelect;
