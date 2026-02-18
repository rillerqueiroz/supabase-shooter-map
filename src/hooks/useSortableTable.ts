import { useState, useMemo } from 'react';

export type SortDirection = 'asc' | 'desc' | null;

export interface SortConfig {
  key: string;
  direction: SortDirection;
}

export function useSortableTable<T>(data: T[]) {
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: '', direction: null });

  const sortedData = useMemo(() => {
    if (!sortConfig.key || !sortConfig.direction) {
      return data;
    }

    return [...data].sort((a, b) => {
      const aValue = (a as any)[sortConfig.key];
      const bValue = (b as any)[sortConfig.key];

      // Handle null/undefined values
      if (!aValue && !bValue) return 0;
      if (!aValue) return sortConfig.direction === 'asc' ? 1 : -1;
      if (!bValue) return sortConfig.direction === 'asc' ? -1 : 1;

      // Helper to detect date strings (ISO format like 2024-01-15 or 2024-01-15T...)
      const isDateString = (val: any): boolean => {
        if (typeof val !== 'string') return false;
        return /^\d{4}-\d{2}-\d{2}/.test(val.trim());
      };

      // Parse date string robustly without UTC shift
      const parseLocalDate = (dateStr: string): Date | null => {
        const match = dateStr.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (!match) return null;
        const [, year, month, day] = match.map(Number);
        if (!year || !month || !day || month < 1 || month > 12 || day < 1 || day > 31) return null;
        return new Date(year, month - 1, day);
      };

      // Try date comparison first (most reliable detection)
      if (isDateString(aValue) && isDateString(bValue)) {
        const aDate = parseLocalDate(aValue);
        const bDate = parseLocalDate(bValue);
        if (aDate && bDate && !isNaN(aDate.getTime()) && !isNaN(bDate.getTime())) {
          return sortConfig.direction === 'asc' 
            ? aDate.getTime() - bDate.getTime() 
            : bDate.getTime() - aDate.getTime();
        }
      }

      // Helper to parse currency strings like "R$ 1.234,56" to number
      const parseCurrency = (val: string): number | null => {
        if (typeof val !== 'string') return null;
        // Skip date-like strings to avoid parseFloat("2024-01-15") = 2024
        if (/^\d{4}-\d{2}-\d{2}/.test(val.trim())) return null;
        const cleaned = val.replace(/[R$\s.]/g, '').replace(',', '.');
        const num = parseFloat(cleaned);
        return isNaN(num) ? null : num;
      };

      // Try to parse as currency (for monetary values)
      const aCurrency = parseCurrency(aValue);
      const bCurrency = parseCurrency(bValue);
      if (aCurrency !== null && bCurrency !== null) {
        return sortConfig.direction === 'asc' ? aCurrency - bCurrency : bCurrency - aCurrency;
      }

      // Handle different data types
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        // Regular string comparison
        const comparison = aValue.toLowerCase().localeCompare(bValue.toLowerCase(), 'pt-BR');
        return sortConfig.direction === 'asc' ? comparison : -comparison;
      }

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
      }

      // Handle dates
      if (aValue instanceof Date && bValue instanceof Date) {
        return sortConfig.direction === 'asc' 
          ? aValue.getTime() - bValue.getTime() 
          : bValue.getTime() - aValue.getTime();
      }

      // Fallback to string comparison
      const aStr = String(aValue).toLowerCase();
      const bStr = String(bValue).toLowerCase();
      const comparison = aStr.localeCompare(bStr, 'pt-BR');
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
  }, [data, sortConfig]);

  const requestSort = (key: string) => {
    let direction: SortDirection = 'asc';
    
    if (sortConfig.key === key) {
      if (sortConfig.direction === 'asc') {
        direction = 'desc';
      } else if (sortConfig.direction === 'desc') {
        direction = null;
      } else {
        direction = 'asc';
      }
    }

    setSortConfig({ key, direction });
  };

  const getSortIcon = (columnKey: string) => {
    if (sortConfig.key !== columnKey) {
      return null;
    }
    
    switch (sortConfig.direction) {
      case 'asc':
        return '↑';
      case 'desc':
        return '↓';
      default:
        return null;
    }
  };

  return {
    sortedData,
    sortConfig,
    requestSort,
    getSortIcon,
  };
}