import { useState, useMemo } from 'react';

export interface PaginationState {
  pageIndex: number;
  pageSize: number;
}

export interface UsePaginationProps<T> {
  data: T[];
  initialPageSize?: number;
}

export function usePagination<T>({ data, initialPageSize = 50 }: UsePaginationProps<T>) {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: initialPageSize,
  });

  const pageCount = Math.ceil(data.length / pagination.pageSize);
  
  const paginatedData = useMemo(() => {
    const start = pagination.pageIndex * pagination.pageSize;
    const end = start + pagination.pageSize;
    return data.slice(start, end);
  }, [data, pagination.pageIndex, pagination.pageSize]);

  const canPreviousPage = pagination.pageIndex > 0;
  const canNextPage = pagination.pageIndex < pageCount - 1;

  const gotoPage = (updater: number | ((old: number) => number)) => {
    const newPageIndex = typeof updater === 'function' ? updater(pagination.pageIndex) : updater;
    setPagination(prev => ({
      ...prev,
      pageIndex: Math.max(0, Math.min(newPageIndex, pageCount - 1))
    }));
  };

  const nextPage = () => {
    if (canNextPage) {
      setPagination(prev => ({ ...prev, pageIndex: prev.pageIndex + 1 }));
    }
  };

  const previousPage = () => {
    if (canPreviousPage) {
      setPagination(prev => ({ ...prev, pageIndex: prev.pageIndex - 1 }));
    }
  };

  const setPageSize = (size: number) => {
    setPagination(prev => ({
      pageIndex: 0, // Reset to first page when changing page size
      pageSize: size
    }));
  };

  return {
    paginatedData,
    pagination,
    pageCount,
    canPreviousPage,
    canNextPage,
    gotoPage,
    nextPage,
    previousPage,
    setPageSize,
    totalItems: data.length,
  };
}