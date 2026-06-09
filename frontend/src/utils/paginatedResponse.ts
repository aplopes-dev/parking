import type { PaginatedMeta, PaginatedResponse } from '../types/pagination';

export function normalizePaginatedResponse<T>(
  data: PaginatedResponse<T> | T[],
  fallback: { page: number; limit: number; sortBy?: string; sortOrder?: PaginatedMeta['sortOrder'] },
): { items: T[]; meta: PaginatedMeta } {
  if (Array.isArray(data)) {
    const total = data.length;
    const { page, limit } = fallback;
    const start = (page - 1) * limit;
    return {
      items: data.slice(start, start + limit),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        sortBy: fallback.sortBy ?? 'createdAt',
        sortOrder: fallback.sortOrder ?? 'DESC',
      },
    };
  }
  return {
    items: data.data ?? [],
    meta: data.meta,
  };
}

export function isPaginatedResponse<T>(data: unknown): data is PaginatedResponse<T> {
  return (
    typeof data === 'object' &&
    data !== null &&
    'data' in data &&
    Array.isArray((data as PaginatedResponse<T>).data) &&
    'meta' in data
  );
}
