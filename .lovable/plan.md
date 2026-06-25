## Resumo

1) No card de análise de pessoas (Upload Oficial + Teste), passar a contar como "a criar" também as linhas **sem CPF/CNPJ mas com `codigo_parceiro`**. Linhas sem CPF **e** sem `codigo_parceiro` continuam ignoradas (vão para "Sem identificador", não viram pessoa).
2) Adicionar filtro **"Pessoas sem CPF/CNPJ"** na tela de Pessoas.

O banco já aceita pessoa sem CPF (`cpf`/`document_digits` nullable) — sem mudança de schema.

## Mudanças

### 1) `src/utils/analyzePeople.ts` (preview)

- Tratar linhas como elegíveis se tiverem **CPF/CNPJ válido OU `codigo_parceiro`**.
- `semIdentificador` = apenas linhas sem os dois (ignoradas).
- `novasACriar` / `novasPreview` passa a incluir as "só com código".
- Dedup dentro do lote: `document_digits` quando existir, senão `cod:{codigo_parceiro}`.
- Cada item do preview ganha `marcador`: `'COM_CPF' | 'SEM_CPF'`.

### 2) Card nas páginas `UploadArquivos.tsx` e `UploadArquivosOficial.tsx`

- Acrescentar métrica **"Sem CPF (a criar via código)"** no grid.
- Na tabela do preview, coluna **Marcador** com Badge:
  - `COM_CPF` → badge neutro
  - `SEM_CPF` → badge âmbar ("Sem CPF · vínculo por código")
- Reformular o aviso âmbar: "X linhas sem CPF e sem código serão ignoradas".

### 3) Filtro "Pessoas sem CPF/CNPJ" — tela `/pessoas`

- `src/utils/supabase-people-mapper.ts` → `FetchPeopleParams` ganha `onlyWithoutDocument?: boolean`. Em `fetchPeople`, quando true, aplicar filtro `.or('document_digits.is.null,document_digits.eq.')` sobre o conjunto de pessoas vinculadas a TUDOBELO/TUDOBELO-FUNDOS (mantém o pipeline atual).
- `src/hooks/usePeople.ts` → repassa o novo parâmetro (já está genérico).
- `src/components/Pessoas/PessoasTable.tsx`:
  - Adicionar um `Switch` (ou `Checkbox`) ao lado do search: **"Apenas sem CPF/CNPJ"**.
  - Resetar `page` para 0 ao alternar.
  - Mostrar contagem ajustada no texto da direita.

### Fora de escopo

- Não alterar `findOrCreatePerson.ts` agora (a análise segue sendo preview). Quando a criação real for habilitada, o mesmo critério (`cpf || codigo_parceiro`) será aplicado lá.
- Sem migração de schema.
