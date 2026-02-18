// Mapeamento entre rotas e screen slugs
export const routeToScreenSlug: Record<string, string> = {
  '/': 'pagina-inicial',
  '/dashboard': 'dashboard',
  '/calendario': 'calendario',
  '/relatorio-cliente': 'relatorio-cliente',
  '/relatorio-devedor': 'relatorio-devedor',
  '/gestao-setor-sul': 'gestao-setor-sul',
  '/relatorio-valores-recebidos': 'valores-recebidos',
  '/todas-cobrancas': 'todas-cobrancas',
  '/gestao-splits': 'gestao-splits',
  '/extrato': 'extrato-bancario',
  '/configuracoes': 'configuracoes',
  '/gestao-usuarios': 'gestao-usuarios',
  '/gestao-pos-acordo': 'gestao-pos-acordo',
  '/criar-cobranca': 'criar-cobranca',
  '/gestao-projetos': 'gestao-projetos',
  '/modelos-contrato': 'modelos-contrato',
  '/beneficiarios-splits': 'beneficiarios-splits',
  '/gestao-contratos': 'gestao-contratos',
  '/gestao-contratos-etapas': 'gestao-contratos-etapas',
  '/gestao-titulos-tudobelo': 'gestao-titulos-tudobelo',
  '/gestao-negativados-tudobelo': 'gestao-negativados-tudobelo',
  
};

export const getScreenSlugFromRoute = (route: string): string | undefined => {
  return routeToScreenSlug[route];
};
