/**
 * Utilitários de normalização de número para cruzamento com `discador_ligacoes`.
 * Mantém apenas dígitos; remove DDI 55 quando aplicável.
 */
export function normalizeNumber(phone: string | null | undefined): string {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith('55')) {
    return digits.slice(2);
  }
  return digits;
}

/**
 * Gera variantes plausíveis do número (com/sem 55, com/sem 9 no celular)
 * para uso em filtros .ilike do PostgREST.
 */
export function variantsOf(digits: string): string[] {
  const out = new Set<string>();
  const d = (digits || '').replace(/\D/g, '');
  if (!d) return [];
  out.add(d);

  // Sem 55
  if (d.startsWith('55') && d.length >= 12) out.add(d.slice(2));
  // Com 55
  if (!d.startsWith('55')) out.add('55' + d);

  // Manipula o 9 do celular (BR): DDD + 9 + 8 dígitos = 11
  // Variantes do "núcleo" (sem 55)
  const core = d.startsWith('55') ? d.slice(2) : d;
  if (core.length === 11 && core[2] === '9') {
    const noNine = core.slice(0, 2) + core.slice(3);
    out.add(noNine);
    out.add('55' + noNine);
  } else if (core.length === 10) {
    const withNine = core.slice(0, 2) + '9' + core.slice(2);
    out.add(withNine);
    out.add('55' + withNine);
  }

  return Array.from(out);
}
