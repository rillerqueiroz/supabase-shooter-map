
## Plano — Confirmação individual para títulos com etapa "ignorar"

### Objetivo
Quando o upload identifica que um título "somente no banco" (candidato a Pago) está em uma etapa marcada como `ignorar=true`, o sistema deve **perguntar individualmente** ao usuário, durante a etapa de confirmação, o que fazer com cada um.

### Mudanças em `src/pages/UploadArquivosOficial.tsx`

**1. Coletar (não pular) títulos em etapa-ignorar na análise**
- Hoje (linha ~515): `if (etapasIgnorar.has(dbRow.etapa)) continue;` — descarta silenciosamente.
- Novo: separar em duas listas dentro de `etapaBloqueadoValidation`:
  - `somenteBancoIds` — títulos limpos, vão direto para Pago.
  - `somenteBancoEtapaIgnorar` — array de `{ id, documento, parcela, etapa, valor, vencimento }` que precisam de decisão manual.
- Remover também o `.slice(0, 100)` em `somenteBancoIds` (bug já identificado).

**2. Novo modal de decisão individual (antes do upload final)**
- Componente inline ou novo arquivo `EtapaIgnorarDecisionModal.tsx`.
- Abre automaticamente quando `somenteBancoEtapaIgnorar.length > 0` ao clicar em "Processar".
- Para cada título, exibe um card com:
  - Texto: *"Esse título será marcado como pago, mas está na etapa **{etapa}**. O que você deseja fazer?"*
  - Dados de contexto: `Documento-Parcela`, valor, vencimento.
  - Dois botões/radio: **Ignorar** (mantém como está) | **Marcar como Pago**.
- Botões globais no rodapé: "Ignorar todos", "Marcar todos como pago" (atalho), "Confirmar e processar".
- O botão "Confirmar e processar" só habilita quando todas as decisões foram tomadas.

**3. Ajuste no `handleUpload`**
- Receber as decisões do modal e mesclar os IDs marcados como "Pago" em `somenteBancoIds` antes de executar o UPDATE em massa.
- Os "Ignorar" não entram no UPDATE.
- Adicionar contadores no `uploadResult`:
  - `totalEtapaIgnorarMarcadosPago`
  - `totalEtapaIgnorarIgnorados`

**4. Card de pré-análise**
- No card "Somente no Banco" mostrar dois números:
  - *X títulos serão marcados como Pago automaticamente*
  - *Y títulos requerem sua decisão (etapa ignorada)*

### Bugs adjacentes corrigidos junto
- Remover `.slice(0, 100)` de `somenteBancoIds` (linha 563).
- Corrigir sintaxe `.not("status_titulo", "in", ...)` para formato PostgREST válido.

### Fluxo final
````text
Análise → [card mostra X auto + Y manual]
   ↓ clica Processar
[se Y > 0] Modal individual → decisões
   ↓ Confirmar
UPDATE em massa (X + escolhidos) → Webhook → Resultado
````

### Arquivos
- `src/pages/UploadArquivosOficial.tsx` (modificado — análise, modal embutido, upload)

Sem novas migrations, sem novas dependências.
