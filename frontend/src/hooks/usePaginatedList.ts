import { useCallback, useEffect, useRef, useState } from 'react';
import { DEFAULT_PAGE_SIZE, type PaginatedMeta, type PaginatedResponse } from '../types/pagination';
import { normalizePaginatedResponse } from '../utils/paginatedResponse';

type FetchPaginatedFn<T, F> = (
  params: F & { page: number; limit: number },
) => Promise<PaginatedResponse<T> | T[]>;

type UsePaginatedListOptions<T, F extends Record<string, unknown>> = {
  fetchFn: FetchPaginatedFn<T, F>;
  filters?: F;
  initialLimit?: number;
  enabled?: boolean;
  sortBy?: string;
  sortOrder?: PaginatedMeta['sortOrder'];
  /** When these values change, page resets to 1 */
  resetDeps?: unknown[];
};

export function usePaginatedList<T, F extends Record<string, unknown> = Record<string, never>>({
  fetchFn,
  filters,
  initialLimit = DEFAULT_PAGE_SIZE,
  enabled = true,
  sortBy = 'createdAt',
  sortOrder = 'DESC',
  resetDeps = [],
}: UsePaginatedListOptions<T, F>) {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(initialLimit);
  const [items, setItems] = useState<T[]>([]);
  const [meta, setMeta] = useState<PaginatedMeta | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const reload = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchFn({
        ...(filtersRef.current ?? ({} as F)),
        page,
        limit,
      });
      const normalized = normalizePaginatedResponse(data, { page, limit, sortBy, sortOrder });
      setItems(normalized.items);
      setMeta(normalized.meta);
    } catch (e) {
      setError(e);
      throw e;
    } finally {
      setLoading(false);
    }
  }, [enabled, fetchFn, page, limit, sortBy, sortOrder]);

  useEffect(() => {
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, resetDeps);

  useEffect(() => {
    void reload().catch(() => undefined);
  }, [reload]);

  const setLimitAndReset = useCallback((next: number) => {
    setLimit(next);
    setPage(1);
  }, []);

  return {
    items,
    meta,
    page,
    limit,
    loading,
    error,
    setPage,
    setLimit: setLimitAndReset,
    reload,
    total: meta?.total ?? 0,
    totalPages: meta?.totalPages ?? 1,
  };
}
