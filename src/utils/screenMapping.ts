// Mapeamento entre rotas e screen slugs
export const routeToScreenSlug: Record<string, string> = {
  '/': 'pagina-inicial',
  '/configuracoes': 'configuracoes',
  '/gestao-usuarios': 'gestao-usuarios',
  '/gestao-titulos-tudobelo': 'gestao-titulos-tudobelo',
  '/analytics-titulos-tudobelo': 'gestao-titulos-tudobelo',
  '/gestao-negativados-tudobelo': 'gestao-negativados-tudobelo',
};

export const getScreenSlugFromRoute = (route: string): string | undefined => {
  return routeToScreenSlug[route];
};
