export type SortDirection = 'ASC' | 'DESC';

export type PaginatedMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  sortBy: string;
  sortOrder: SortDirection;
  counts?: {
    active?: number;
    inactive?: number;
  };
};

export type PaginatedResponse<T> = {
  data: T[];
  meta: PaginatedMeta;
};

export const DEFAULT_PAGE_SIZE = 10;
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export type TablePaginationProps = {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  disabled?: boolean;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
};
