# Plano — Página Pessoas (Data Lake) com vínculo TUDOBELO / TUDOBELO-FUNDOS

## Objetivo
Nova página `/pessoas` que lista, busca, edita e deduplica pessoas do data lake (`people`) que tenham vínculo ativo em `people_creditors` com `creditor_code IN ('TUDOBELO','TUDOBELO-FUNDOS')`. Sem migração de schema — as tabelas já existem no Supabase.

## Escopo (Fase 1)
1. Listagem paginada com busca (nome, CPF/CNPJ, telefone) e filtro fixo nos dois credores.
2. Modal de detalhe da pessoa: dados cadastrais + telefones + credores + IDs externos + títulos vinculados (via `base_tudobelo_intermediaria.cnpj_cpf`).
3. Edição inline da pessoa e CRUD de telefones (adicionar / validar / invalidar / marcar WhatsApp).
4. Aba "Duplicados" com `people_duplicates` e ação de merge via RPC `merge_people`.

## Arquitetura

### Backend (já existente — apenas consumir)
- `people`, `people_phones`, `people_creditors`, `people_external_ids`
- VIEW `people_duplicates`, RPC `merge_people(_canonical, _duplicates[])`
- RLS permissiva `authenticated`; segurança real via screen permission.

### Frontend — novos arquivos
```
src/types/people.ts                          # Person, PersonPhone, PersonCreditor, PersonExternalId
src/utils/supabase-people-mapper.ts          # API TS (porta da existente em outro projeto)
src/utils/normalize-phone.ts                 # normalizarTelefone / variantesTelefone
src/hooks/usePeople.ts                       # fetchPeople paginado + filtro fixo TUDOBELO/-FUNDOS
src/hooks/usePersonDetail.ts                 # pessoa + telefones + credores + external_ids
src/hooks/usePeopleMutations.ts              # update person, add/validate/invalidate phone, addCreditor
src/hooks/usePeopleDuplicates.ts             # grupos + mergeMutation
src/hooks/useTitulosByCpf.ts                 # títulos em base_tudobelo_intermediaria por document_digits

src/pages/Pessoas.tsx                        # shell com tabs: "Pessoas" | "Duplicados"
src/components/Pessoas/PessoasTable.tsx      # tabela + busca + paginação (DataTablePagination)
src/components/Pessoas/PessoaDetailsModal.tsx
src/components/Pessoas/PessoaInfoTab.tsx
src/components/Pessoas/PessoaTelefonesTab.tsx
src/components/Pessoas/PessoaCredoresExternosTab.tsx
src/components/Pessoas/PessoaTitulosTab.tsx
src/components/Pessoas/DuplicadosTab.tsx
src/components/Pessoas/MergePeopleDialog.tsx
```

### Frontend — arquivos editados
- `src/App.tsx` — rota `/pessoas` protegida por `ProtectedScreen` slug `pessoas`.
- `src/components/Layout/AppSidebar.tsx` — novo item "Pessoas" (ícone `Users`).
- `src/utils/screenMapping.ts` — mapeia `/pessoas` → `pessoas`.

## Lógica de filtro fixo TUDOBELO
Constante única `TUDOBELO_CREDITORS = ['TUDOBELO','TUDOBELO-FUNDOS']` (em `supabase-people-mapper.ts`).

Pipeline de `fetchPeople`:
1. Consultar `people_creditors` com `creditor_code.in.(TUDOBELO,TUDOBELO-FUNDOS)` e `status='ativo'`, paginando em chunks de 1000 com `.range()` → `personIds` (Set, dedup).
2. Sobre esse Set, aplicar filtros adicionais em `people`:
   - busca por nome: `name.ilike.%q%`
   - busca por documento: extrai dígitos; se ≥3 dígitos usa `document_digits.ilike.%digits%`
   - busca por telefone: se a query tem ≥4 dígitos, usar `variantesTelefone` em `people_phones.phone.ilike.%v%` → mapeia `person_id` e intersecta com o Set
3. `merged_into_id is null` sempre.
4. Paginação no client (a lista de IDs costuma caber); para growth, alternativa documentada: chunked `id.in.(...)` com `.range(from,to)`.

## Modal de detalhe — abas
- **Info**: campos editáveis (`name`, `cpf`, `email`, endereço, RG, nascimento, `person_type`, bloco cônjuge). Botão Salvar usa `updatePerson`.
- **Telefones**: tabela com `phone`, `phone_type`, `source`, badges WhatsApp / Validado / Inválido; ações Adicionar / Validar / Invalidar / Toggle WhatsApp.
- **Credores & IDs externos**: lista todos `people_creditors` (destaca TUDOBELO/-FUNDOS); lista `people_external_ids` agrupados por `system`. Adicionar credor / external_id manualmente.
- **Títulos**: consulta `base_tudobelo_intermediaria` por `cnpj_cpf` normalizado (document_digits da pessoa). Linha clicável abre `TituloDetailsModal` existente.

## Aba Duplicados
- Lista grupos de `people_duplicates` (paginado).
- Em cada grupo: seleciona canônico (default = mais antigo) e confirma merge via `MergePeopleDialog` → RPC `merge_people(canonical, duplicates[])`.
- Toast + invalidação de queries.

## Permissão
- Adicionar screen slug `pessoas` ao seed/lista (`useGestaoSplitsScreensList` / banco de permissões) — operação manual de admin pela tela de permissões existente. Plano não cria migration de seed; documentado no PR.

## Padrões respeitados
- Marca Superavit (Preto/Dourado), tabelas no padrão existente, `DataTablePagination`, modais full-width com `Dialog`, `useQuery`/`useMutation` com invalidations otimistas.
- Bypass do limite 1000 com `.range()` em chunks (`supabaseBatch.ts` quando aplicável).
- Telefones: nunca normalizar na escrita; normalizar na busca com `variantesTelefone`.
- `creditor_code` sempre `.toUpperCase().trim()` ao escrever.

## Fora de escopo
- Sync com Cedrus / cascata `fetchCedrusByPhones`.
- Importação em massa de pessoas.
- Criar pessoa do zero (apenas via backfill externo, conforme combinado).
- VIEWs legadas `base_devedores`/`telefones_devedores` (não usadas neste projeto).
