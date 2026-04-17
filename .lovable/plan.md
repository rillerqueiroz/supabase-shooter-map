
## Problema identificado

Na tela `/upload-arquivos-oficial`, a query que busca títulos do banco para comparar com a planilha (linhas 528–531 de `src/pages/UploadArquivosOficial.tsx`) **não usa paginação/batching**. O Supabase aplica um limite padrão (1000 linhas), então qualquer título além desse limite é silenciosamente descartado e nunca aparece na seção "Somente banco". É por isso que 201810-5 e 202183-5 não estão sendo identificados, mesmo tendo etapa "Títulos a vencer" e status "A vencer".

Além disso, o filtro `.or()` com vários `status_titulo.not.eq.` é logicamente inerte (qualquer valor satisfaz pelo menos um `not.eq`), ou seja, não filtra nada hoje. Trocaremos por algo que realmente exclua os finalizados, conforme você pediu.

## O que vou alterar

Arquivo único: `src/pages/UploadArquivosOficial.tsx` (função `handleAnalyze`, em torno das linhas 525–567).

1. **Substituir a query única por busca paginada** usando o helper já existente `fetchAllSupabaseRows` (de `src/lib/supabaseBatch.ts`, lotes de 500), garantindo que todos os títulos sejam carregados, sem teto de 1000.

2. **Corrigir o filtro de status finalizados** trocando o `.or()` quebrado por:
   - `.not('status_titulo', 'in', '("Pago","Pago em dia","Pago via renegociação","Negociado","Cancelado","Suspenso","Não se aplica")')`
   - Inclui "Negociado" para alinhar com `statusFinalizado` já usado na lógica.
   - Títulos com `status_titulo = null` continuam sendo retornados (NOT IN ignora nulls — mantemos esse comportamento, que é o desejado).

3. **Manter a lógica subsequente intacta**: split entre `somenteBancoIds`, `somenteBancoEtapaIgnorar` e títulos silenciosamente pulados continua funcionando como hoje, só que agora sobre o conjunto completo.

## Resultado esperado

Após a mudança, ao rodar a análise da planilha, títulos como 201810-5 e 202183-5 (etapa normal, status "A vencer") aparecerão corretamente na seção "Somente banco" para serem marcados como Pago automaticamente.

## Detalhes técnicos

```ts
import { fetchAllSupabaseRows } from "@/lib/supabaseBatch";

const statusFinalizadosFiltro = ["Pago","Pago em dia","Pago via renegociação","Negociado","Cancelado","Suspenso","Não se aplica"];
const inList = `(${statusFinalizadosFiltro.map(s => `"${s}"`).join(",")})`;

const allDbIds = await fetchAllSupabaseRows<any>(async (from, to) => {
  return await supabase
    .from("base_tudobelo_intermediaria")
    .select("id, documento, numero_parcela, nome_parceiro, status_titulo, etapa, bloqueado, forma_pagamento, data_vencimento, saldo_parcela, inserido_cedrus")
    .not("status_titulo", "in", inList)
    .range(from, to);
}, 500);
```

O loop existente `for (const dbRow of allDbIds)` continua sem mudanças.
