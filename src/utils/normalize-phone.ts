/**
 * Normaliza telefone BR: mantém apenas dígitos e remove DDI 55 quando
 * o número tem 12 ou 13 dígitos (formato internacional).
 */
export function normalizarTelefone(phone: string | null | undefined): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith('55')) {
    return digits.slice(2);
  }
  return digits;
}

/**
 * Gera variantes de telefone (sufixos de 8, 10 e 11 dígitos) para
 * buscas tolerantes a máscara/DDI/DDD.
 */
export function variantesTelefone(phone: string | null | undefined): string[] {
  const norm = normalizarTelefone(phone);
  if (!norm) return [];
  const out = new Set<string>();
  if (norm.length >= 8) out.add(norm.slice(-8));
  if (norm.length >= 10) out.add(norm.slice(-10));
  if (norm.length >= 11) out.add(norm.slice(-11));
  out.add(norm);
  return Array.from(out);
}

/** Mantém só dígitos (CPF/CNPJ). */
export function onlyDigits(value: string | null | undefined): string {
  return (value || '').replace(/\D/g, '');
}

/** Formata CPF/CNPJ para exibição. */
export function formatDocument(value: string | null | undefined): string {
  const d = onlyDigits(value);
  if (d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  if (d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  return value || '';
}

/** Formata telefone BR para exibição (DDD + número). */
export function formatPhone(value: string | null | undefined): string {
  const d = normalizarTelefone(value);
  if (d.length === 11) return d.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  if (d.length === 10) return d.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  return value || '';
}
