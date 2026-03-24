

## Copiar integralmente a página de produção para testes

### Problema
A página `GestaoTitulosParaTestes` tem apenas a aba "Dados". A página de produção (`GestaoTitulosTudoBelo`) tem 7 abas: Dados, Histórico de Inserções, Log de Alterações, Títulos Pendentes, Visão por Etapas, Inadimplência por Credor, Títulos Baixados.

### Abordagem
Copiar integralmente a estrutura da produção, incluindo todas as abas, ações (inserir Cedrus, remover, marcar pago, enviar emails) e modais. As abas que fazem queries internas (`TitulosPendentesTab`, `VisaoEtapasTab`, `TitulosBaixadosTab`) precisam aceitar um parâmetro de tabela para consultar `base_tudobelo_para_testes` em vez de `base_tudobelo_intermediaria`.

### Arquivos modificados

**1. `src/pages/GestaoTitulosParaTestes.tsx`**
- Copiar integralmente o conteúdo de `GestaoTitulosTudoBelo.tsx`
- Trocar hooks de `useTitulosTudoBelo` para `useTitulosParaTestes`
- Trocar hooks de `useTitulosTudoBeloOptions` para `useTitulosParaTestesOptions`
- Trocar mutations de `useBulkUpdateTitulosTudoBelo` para `useBulkUpdateTitulosParaTestes`
- Manter header com badge "AMBIENTE DE TESTES" e ícone FlaskConical
- Adicionar todas as 7 abas (Dados, Histórico, Log, Pendentes, Visão Etapas, Inadimplência, Baixados)
- Adicionar todos os modais (detalhes, bulk edit, inserção Cedrus, confirmação, emails)
- Adicionar botão de enviar emails e exportações
- Passar prop `tableName="base_tudobelo_para_testes"` para sub-tabs que fazem queries próprias

**2. `src/components/TitulosTudoBelo/TitulosPendentesTab.tsx`**
- Adicionar prop opcional `tableName?: string` (default: `base_tudobelo_intermediaria`)
- Passar para os hooks `useTitulosTudoBelo` / `useTitulosTudoBeloOptions` / `useBulkUpdateTitulosTudoBelo`

**3. `src/components/TitulosTudoBelo/VisaoEtapasTab.tsx`**
- Adicionar prop opcional `tableName?: string`
- Passar para os hooks internos

**4. `src/components/TitulosTudoBelo/TitulosBaixadosTab.tsx`**
- Adicionar prop opcional `tableName?: string`
- Passar para `useTitulosBaixados`

**5. `src/hooks/useTitulosTudoBelo.ts`**
- Adicionar parâmetro opcional `tableName` nas funções `useTitulosTudoBelo`, `useTitulosTudoBeloOptions`, `useUpdateTituloTudoBelo`, `useBulkUpdateTitulosTudoBelo`
- Usar `tableName` no `.from()` em vez do valor hardcoded

**6. `src/hooks/useTitulosBaixados.ts`**
- Adicionar parâmetro opcional `tableName` para que o cruzamento de dados use a tabela correta

**7. `src/components/TitulosTudoBelo/InadimplenciaCredorTab.tsx`**
- Já recebe `titulos` como prop, não precisa de alteração

**8. `src/components/TitulosTudoBelo/HistoricoAtualizacoesTab.tsx` e `LogAlteracoesTab.tsx`**
- Usar como estão (compartilhados entre produção e testes, pois os logs são globais)

### Resultado
A página de testes será uma cópia funcional completa da produção, consultando `base_tudobelo_para_testes` em todas as queries, mantendo a identidade visual de ambiente de testes.

