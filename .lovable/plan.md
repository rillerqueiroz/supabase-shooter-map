## Objetivo
Durante a análise do arquivo (antes do envio), mostrar quantas pessoas (CPFs) da planilha já existem em `people` e quantas seriam criadas. **Sem alterar a lógica de inserção** — a criação real continua acontecendo apenas no Step 2 do upload, somente para títulos novos, e nunca atualiza pessoas existentes.

## Aplicado em
- `src/pages/UploadArquivosOficial.tsx`
- `src/pages/UploadArquivos.tsx` (teste)

## O que o card vai mostrar
Durante `handleAnalyze`, calcular contra `analysis.records` (linhas já filtradas):

- **Total de linhas** analisadas
- **Sem CPF e sem código parceiro** — linhas que não conseguem ser vinculadas
- **CPFs distintos na planilha**
- **Já existem em `people`** (match por `external_id = codigo_parceiro` no sistema `tudobelo` OU por `documento = cnpj_cpf` normalizado)
- **Novas pessoas a criar** (distinct CPFs/códigos não encontrados)
- Lista expandível com os primeiros ~100 candidatos a criação (Nome, CPF, Código Parceiro)

## Como descobrir o que já existe
Reaproveitar a mesma estratégia de prefetch do `resolveOrCreatePeopleForRecords`, **sem chamar create**. Implementar um helper novo, puro de leitura:

```
analyzePeopleForRecords(records, { externalSystem: 'tudobelo' })
  → { totalRecords, semIdentificador, distinctCount,
      existentes, novas, novasPreview[] }
```

- Em `src/utils/findOrCreatePerson.ts` (ou arquivo irmão `analyzePeople.ts`).
- Normaliza `cnpj_cpf` para dígitos.
- Faz batch select em `people_external_ids` (system='tudobelo', external_id IN códigos) e `people` (documento IN cpfs) — mesmo padrão do prefetch atual.
- Retorna estatísticas — não escreve nada.

## Onde renderizar
Novo card "Análise de Pessoas (CPFs)", inserido logo abaixo do card "Novos Títulos" (linha ~1392 oficial / ~1170 teste). Visual coerente com os demais cards de análise (mesmo padrão de `Collapsible` + lista). Não altera nenhum outro card.

## Onde plugar o cálculo
Dentro de `handleAnalyze`, após montar `result.records` (e o filtro de bloqueados/etapa-ignorar). Guardar em `result.peopleAnalysis` (novo campo opcional na interface `AnalysisResult`).

## O que NÃO muda
- `handleUpload` continua igual: `resolveOrCreatePeopleForRecords` segue rodando apenas para `newRecords`.
- Nenhuma pessoa existente é alterada.
- Nenhuma migração de schema.
- Nenhuma alteração nas demais cards/colunas.

## Arquivos a criar/editar
- **Novo**: `src/utils/analyzePeople.ts` — função pura de análise.
- **Editar**: `src/pages/UploadArquivosOficial.tsx` — chamar análise + renderizar card.
- **Editar**: `src/pages/UploadArquivos.tsx` — idem.
