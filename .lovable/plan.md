## Objetivo

Adicionar botão **"Atualizar Cedrus"** que sincroniza `status_cedrus`, `inserido_cedrus` e `id_titulo_cedrus` a partir da API Cedrus, com preview de diffs antes de gravar. Localizações: bulk na aba **Títulos Pendentes** e individual no **TituloDetailsModal**.

Observação: `id_devedor_cedrus` foi mencionado, mas a tabela atual não tem essa coluna — vou ignorá-lo (fora do escopo desta task; se quiser, criamos migration em passo separado).

## Passos

### 1. Hook `useAtualizarCedrus`
`src/hooks/useAtualizarCedrus.ts` — expõe:
- `consultarTitulo(titulo)`: chama `supabase.functions.invoke('cedrus-consultar-titulo', { body: { cod_titulo: titulo.documento, parcela: titulo.numero_parcela } })` (fallback `id_titulo` quando já existir `id_titulo_cedrus`).
- Extrai da resposta: `id_titulo`, `status` (mapeado para nosso `status_cedrus`), presença de registro → `inserido_cedrus: true`.
- Retorna `{ found, remote: { status_cedrus, inserido_cedrus, id_titulo_cedrus } }`.

### 2. Utilitário `computeCedrusDiff(local, remote)`
`src/utils/cedrusDiff.ts` — compara apenas os 3 campos e retorna array `{ campo, valorAnterior, valorNovo }[]` (vazio quando idêntico).

### 3. Dialog de preview `AtualizarCedrusPreviewDialog`
`src/components/TitulosTudoBelo/AtualizarCedrusPreviewDialog.tsx` — reutiliza padrão dos dialogs existentes:
- Recebe `results: { titulo, diffs, remote, error? }[]`.
- Tabela agrupando por título: parceiro, documento, colunas "campo / de → para", badge de status (Sem alteração, Divergente, Não encontrado, Erro).
- Botões: **Cancelar** / **Aplicar N alterações** (só grava linhas com diffs).
- Ao confirmar: `UPDATE base_tudobelo_intermediaria` via `supabaseBatch` apenas nos campos alterados (padrão diff-only já usado no upload). Trigger `log_titulo_alteracao` grava histórico automaticamente com `origem='cedrus_sync'` (setar via `set_config` se aplicável, senão default).
- Invalida `queryClient.invalidateQueries(['titulos-tudobelo'])`.

### 4. Botão bulk em `TitulosPendentesTab.tsx`
- Adicionar `<Button variant="outline">` "Atualizar Cedrus" ao lado dos botões de ação existentes.
- Ao clicar: itera os títulos atualmente exibidos (`filteredTitulos`) com concorrência controlada (ex.: 5 em paralelo) chamando `consultarTitulo`, mostra `<Progress>` inline com contador `X / total`.
- Ao concluir, abre `AtualizarCedrusPreviewDialog` com todos os resultados (incluindo "sem alterações" colapsados).

### 5. Botão individual em `TituloDetailsModal.tsx`
- Adicionar `<Button size="sm">` "Atualizar Cedrus" no header do modal (perto de "Inserir no Cedrus" existente).
- Fluxo: 1 chamada → abre o mesmo `AtualizarCedrusPreviewDialog` com 1 item.

### 6. Mapeamento status Cedrus
Confirmar o vocabulário: Cedrus retorna `status` (ex.: `A`, `B`, `C`, ...). Reaproveitar `STATUS_CEDRUS_OPTIONS` já existente no modal para exibir label; gravar o código bruto em `status_cedrus`.

## Detalhes técnicos

- **Autenticação**: `supabase.functions.invoke` já anexa o Bearer JWT do usuário logado — cobre o requisito das edge functions de consulta.
- **Concorrência**: helper `pLimit`-like inline (Promise pool) para evitar sobrecarga; 5 requests simultâneos.
- **Erros por título**: capturados individualmente (Promise.allSettled) e exibidos como linha "Erro" no dialog, sem abortar o lote.
- **Diff-only write**: apenas campos com valor diferente entram no `update`, seguindo o padrão de `UploadArquivos`.
- **Nada muda no backend**: as edge functions já existem; nenhuma migration necessária.

## Arquivos

Novos:
- `src/hooks/useAtualizarCedrus.ts`
- `src/utils/cedrusDiff.ts`
- `src/components/TitulosTudoBelo/AtualizarCedrusPreviewDialog.tsx`

Editados:
- `src/components/TitulosTudoBelo/TitulosPendentesTab.tsx` (botão bulk + progress)
- `src/components/TitulosTudoBelo/TituloDetailsModal.tsx` (botão individual no header)
