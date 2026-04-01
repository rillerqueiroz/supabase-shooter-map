

## Plano: Aba "Checagem de Inconsistências"

### O que será feito
Criar uma nova aba na página de Gestão de Títulos que lista títulos com dados inconsistentes, agrupados por tipo de inconsistência.

### Regras de inconsistência

1. **Etapa "Títulos a vencer" + Status "Pago"** — título marcado como pago mas na etapa de a vencer
2. **Status "Pago" sem data de pagamento** — título pago mas sem `data_pagamento` preenchida
3. **Status "Pago" sem valor pago** — título pago mas sem `valor_pago`
4. **Inserido no Cedrus = true sem ID Cedrus** — marcado como inserido mas sem `id_titulo_cedrus`
5. **Negativado = true + Status "Pago"** — título pago que continua negativado
6. **Etapa "Cobrança Superavit" + processado_internamente = false** — deveria ter sido processado
7. **Data de vencimento futura + Status "Vencido"** — status vencido mas data ainda não passou

### Arquivos

1. **Novo componente** `src/components/TitulosTudoBelo/ChecagemInconsistenciasTab.tsx`
   - Recebe `titulos: TituloTudoBelo[]` como prop (reutiliza dados já carregados)
   - Filtra os títulos por cada regra via `useMemo`
   - Exibe seções colapsáveis (Accordion) com badge de contagem
   - Cada seção mostra tabela compacta com ID, parceiro, status, etapa e campos relevantes

2. **Editar** `src/pages/GestaoTitulosTudoBelo.tsx`
   - Adicionar nova `TabsTrigger` "Checagem de Inconsistências" com ícone `AlertTriangle`
   - Adicionar `TabsContent` renderizando o novo componente

### Detalhes técnicos
- Sem queries adicionais ao banco — usa os dados já carregados em memória
- Componente Accordion do shadcn para colapsar/expandir cada regra
- Badge na aba com contagem total de inconsistências encontradas

