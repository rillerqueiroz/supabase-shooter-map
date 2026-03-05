

## Plano: Adicionar seleção múltipla no editor de permissões de telas

### O que muda

Adicionar ao `ScreenPermissionsEditor.tsx` botões de ação em massa no cabeçalho da tabela:

1. **Checkbox "Selecionar Todos" por coluna** -- No header de cada coluna (Ver, Criar, Editar, Excluir), adicionar um checkbox que marca/desmarca todas as telas daquela permissão de uma vez.

2. **Botão "Marcar Todas" e "Desmarcar Todas"** -- Acima da tabela, dois botões para marcar ou desmarcar todas as permissões de todas as telas de uma vez.

### Arquivo a editar

- `src/components/UserManagement/ScreenPermissionsEditor.tsx`

### Mudanças

- Adicionar função `handleToggleAllForField(field, value)` que percorre todas as telas e marca/desmarca a permissão especificada para cada uma.
- Adicionar função `handleToggleAll(value)` que marca/desmarca todas as 4 permissões de todas as telas.
- No `thead`, cada coluna de permissão ganha um `Checkbox` que reflete se todas as telas estão marcadas para aquele campo, e ao clicar alterna todas.
- Acima da tabela, adicionar botões "Marcar Todas" e "Desmarcar Todas".

