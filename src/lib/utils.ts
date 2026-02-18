import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formata uma data vinda do banco de dados para exibição.
 * Corrige problemas de timezone e interpretação de datas.
 * 
 * @param dateString - String da data no formato YYYY-MM-DD ou YYYY-MM-DDTHH:mm:ss
 * @param format - Formato de saída ('pt-BR' padrão)
 * @returns Data formatada ou '-' se inválida
 */
export function formatDateFromDatabase(
  dateString: string | null | undefined, 
  format: 'pt-BR' | 'iso' = 'pt-BR'
): string {
  if (!dateString) return '-';
  
  try {
    // Remove timezone info se presente para evitar problemas de interpretação
    const cleanDateString = dateString.includes('T') 
      ? dateString.split('T')[0] 
      : dateString;
    
    // Parse manual para garantir interpretação correta (YYYY-MM-DD)
    const [year, month, day] = cleanDateString.split('-').map(num => parseInt(num));
    
    if (!year || !month || !day || isNaN(year) || isNaN(month) || isNaN(day)) {
      console.warn('⚠️ Data inválida encontrada:', dateString);
      return '-';
    }
    
    // Criar data com mês corrigido (month - 1)
    const date = new Date(year, month - 1, day);
    
    // Validar se a data criada é válida
    if (isNaN(date.getTime())) {
      console.warn('⚠️ Data inválida após parsing:', dateString);
      return '-';
    }
    
    return format === 'pt-BR' 
      ? date.toLocaleDateString('pt-BR')
      : date.toISOString().split('T')[0];
      
  } catch (error) {
    console.warn('⚠️ Erro ao formatar data:', dateString, error);
    return '-';
  }
}

/**
 * Converte uma string de data do banco para objeto Date.
 * Usado para cálculos e comparações.
 * 
 * @param dateString - String da data no formato YYYY-MM-DD ou YYYY-MM-DDTHH:mm:ss
 * @returns Objeto Date ou null se inválido
 */
export function parseDateFromDatabase(dateString: string | null | undefined): Date | null {
  if (!dateString) return null;
  
  try {
    const cleanDateString = dateString.includes('T') 
      ? dateString.split('T')[0] 
      : dateString;
    
    const [year, month, day] = cleanDateString.split('-').map(num => parseInt(num));
    
    if (!year || !month || !day || isNaN(year) || isNaN(month) || isNaN(day)) {
      return null;
    }
    
    const date = new Date(year, month - 1, day);
    
    return isNaN(date.getTime()) ? null : date;
    
  } catch (error) {
    console.warn('⚠️ Erro ao fazer parse da data:', dateString, error);
    return null;
  }
}
