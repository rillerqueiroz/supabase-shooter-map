// Mapeamento entre rotas e screen slugs
export const routeToScreenSlug: Record<string, string> = {
  '/': 'pagina-inicial',
  '/configuracoes': 'configuracoes',
  '/gestao-usuarios': 'gestao-usuarios',
  '/gestao-titulos-tudobelo': 'gestao-titulos-tudobelo',
  '/analytics-titulos-tudobelo': 'gestao-titulos-tudobelo',
  '/gestao-negativados-tudobelo': 'gestao-negativados-tudobelo',
  '/upload-arquivos': 'upload-arquivos',
  '/upload-arquivos-oficial': 'upload-arquivos-oficial',
  '/upload-pagos-oficial': 'upload-pagos-oficial',
  '/titulos-pagos-tudobelo': 'gestao-titulos-tudobelo',
  '/gestao-titulos-testes': 'upload-arquivos',
  '/checagem-inconsistencias': 'gestao-titulos-tudobelo',
  '/gestao-acesso-sistemas': 'configuracoes',
};

export const getScreenSlugFromRoute = (route: string): string | undefined => {
  return routeToScreenSlug[route];
};
