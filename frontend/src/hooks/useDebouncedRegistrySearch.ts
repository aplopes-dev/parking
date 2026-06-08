import { useCallback, useEffect, useRef, useState } from 'react';

const DEFAULT_DEBOUNCE_MS = 500;

/**
 * Campo de busca + termo aplicado com debounce (padrão Food).
 * Buscar/Enter chama applySearchNow; Limpar zera imediatamente.
 */
export function useDebouncedRegistrySearch(
  debounceMs = DEFAULT_DEBOUNCE_MS,
  onDebounced?: () => void,
) {
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const onDebouncedRef = useRef(onDebounced);
  const appliedRef = useRef('');
  onDebouncedRef.current = onDebounced;

  const commitSearch = useCallback((next: string) => {
    if (next === appliedRef.current) return;
    appliedRef.current = next;
    setSearchDebounced(next);
    onDebouncedRef.current?.();
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      commitSearch(search.trim());
    }, debounceMs);
    return () => window.clearTimeout(timer);
  }, [search, debounceMs, commitSearch]);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
  }, []);

  const applySearchNow = useCallback(() => {
    commitSearch(search.trim());
  }, [search, commitSearch]);

  const clearSearch = useCallback(() => {
    setSearch('');
    commitSearch('');
  }, [commitSearch]);

  return {
    search,
    searchDebounced,
    handleSearchChange,
    applySearchNow,
    clearSearch,
  };
}
