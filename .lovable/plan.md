

## Plano: Expandir critérios da aba "Remover Negativação" e destacar títulos por Status Cedrus

### Mudanças

**1. `src/pages/GestaoNegativadosTudoBelo.tsx`** — Atualizar o filtro `removerData`:

```ts
const removerData = useMemo(() =>
  (titulos || []).filter(t =>
    t.negativado === true && (
      t.status_titulo?.toLowerCase().includes('pago') ||
      t.status_titulo?.toLowerCase().includes('negociado') ||
      ['N', 'P'].includes(t.status_cedrus || '')
    )
  ),
  [titulos]
);
```

Passar `removerData` (e não `negativadosData`) para o `RemoverNegativacaoTab`:
```tsx
<RemoverNegativacaoTab titulos={removerData} isLoading={isLoading} />
```

Atualizar a métrica `pendentesRemocao` para usar `removerData.length` (já usa).

**2. `src/components/NegativadosTudoBelo/RemoverNegativacaoTab.tsx`**:

- Adicionar coluna **"St. Cedrus"** na tabela (sortable header).
- Na célula de cada linha, exibir o `status_cedrus`. Quando o título entrou na aba **por causa do status_cedrus** (N ou P) e não por status_titulo pago, destacar a linha com um banner/badge amarelo de alerta: **"⚠ Verifique se a negociação foi paga"**.
- Lógica: se `status_cedrus` é "N" ou "P" e `status_titulo` **não** contém "pago", mostrar o destaque amarelo na linha (bg amarelo claro + tooltip/badge de aviso).
- Atualizar o `colSpan` da linha vazia de 9 para 10.

### Resultado

Títulos aparecem na aba Remover Negativação se `negativado === true` **E** pelo menos um dos critérios:
- `status_titulo` contém "pago" ou "negociado"
- `status_cedrus` é "N" (Negociado) ou "P" (Pago)

Títulos que entraram apenas pelo critério de `status_cedrus` terão destaque visual amarelo pedindo conferência.

