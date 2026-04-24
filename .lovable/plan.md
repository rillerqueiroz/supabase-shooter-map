
## Plano: Impedimento de Negativação

### 1. Banco de dados (migration)
Adicionar coluna em `base_tudobelo_intermediaria`:
- `impedido_negativacao boolean default false`
- `motivo_impedimento_negativacao text` (opcional, para registrar o porquê)
- `data_impedimento_negativacao timestamptz` (auditoria)

### 2. Tipos (`useTitulosTudoBelo.ts`)
- Adicionar os 3 campos à interface `TituloTudoBelo`.
- Incluir `impedido_negativacao` nos `select(...)` da query principal.

### 3. Página `GestaoNegativadosTudoBelo.tsx`
- Recalcular `negativarData` para excluir `impedido_negativacao === true` por padrão.
- Adicionar 5º card de métrica **"Impedidos de Negativar"** (count + saldo total).
- Cards continuam baseados na base completa (independentes de filtros da aba), mas o de "Pendentes Negativar" passa a refletir só os negativáveis (sem impedidos).

### 4. Aba Negativar (`NegativarTab.tsx`)
- Receber também a lista completa de pendentes (com impedidos) ou aplicar o filtro internamente — vou repassar `negativarData` já filtrado + `impedidosData` separado via props.
- Novo toggle no topo: **"Exibir impedidos"** (ícone ShieldOff). Off por padrão.
  - Off → mostra só negativáveis.
  - On → mistura impedidos na tabela com badge visual "Impedido" (linha em opacity reduzida, checkbox desabilitado).
- Nova coluna "Impedido" na tabela (badge vermelho quando true).
- Ações em massa só selecionam não-impedidos (checkbox desabilitado para impedidos).
- **Recalcular contagem do badge "X títulos disponíveis para negativação"** com base no `filtered` atual (já reativo), refletindo filtros aplicados.
- **Os 4 cards de métrica no topo da página passam a reagir aos filtros aplicados na aba ativa** — vou elevar o estado de filtros para o componente pai OU recalcular via callback. Abordagem escolhida: manter filtros locais na aba e expor `onFilteredChange(filteredData)` para o pai recalcular cards quando a aba Negativar estiver ativa.

### 5. Ação de marcar como impedido
- Novo botão "Marcar como impedido" aparece quando há seleção (ao lado de "Negativar X selecionados").
- Abre dialog pedindo motivo (textarea obrigatório).
- Atualiza os títulos selecionados via `update` no Supabase + log em `base_tudobelo_negativacoes_log` com `acao = 'impedimento'`.
- Inverso: na visualização de impedidos (com toggle on), botão "Remover impedimento" para os selecionados impedidos.

### 6. Hook novo `useImpedirNegativacao` em `useNegativacoes.ts`
- `useMarcarImpedido({ tituloIds, motivo })` — update em massa + insert no log.
- `useRemoverImpedimento({ tituloIds, motivo })` — limpa flag + log.

### Arquivos alterados
- **Migration nova**: adicionar 3 colunas em `base_tudobelo_intermediaria`.
- `src/hooks/useTitulosTudoBelo.ts` — interface + select.
- `src/hooks/useNegativacoes.ts` — 2 mutations novas.
- `src/pages/GestaoNegativadosTudoBelo.tsx` — 5º card + filtro de impedidos + callback de filtros reativos.
- `src/components/NegativadosTudoBelo/NegativarTab.tsx` — toggle, coluna, dialog impedir, ações em massa, callback de filtros.

### Decisões assumidas
- Toggle "Exibir impedidos" mantém os impedidos **misturados na mesma tabela** (não em sub-aba), com indicação visual.
- Cards de métricas reagem **somente** aos filtros da aba atualmente ativa; nas demais abas mantém comportamento atual baseado na base completa.
- Nada muda nas abas "Títulos Negativados", "Remover Negativação" e "Histórico".
