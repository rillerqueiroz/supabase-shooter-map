

## Why only 1000 titles load

The Supabase JavaScript client enforces a **default limit of 1000 rows** per query. The current code does not override this.

## Plan

### 1. Add pagination at the database level

Instead of fetching all rows at once (which would be slow for large datasets), implement **server-side pagination** using Supabase's `.range()` method.

**Changes to `src/hooks/useTitulosTudoBelo.ts`:**
- Add `page` and `pageSize` parameters to the query hook
- Use `.range(from, to)` to fetch only the current page
- Add a separate count query using `.select('*', { count: 'exact', head: true })` to get the total number of records
- Return both `data` and `totalCount`

**Changes to `src/components/TitulosTudoBelo/TitulosPendentesTab.tsx` (and similar tabs):**
- Replace the client-side `usePagination` hook with server-side pagination state
- Pass `page`/`pageSize` to the query hook
- Update `DataTablePagination` to use the server-side total count

### 2. Same pattern for `useTitulosParaTestes.ts`

Apply the identical server-side pagination approach.

### 3. Update options query

The options/filter-values query also hits the 1000-row limit. Change it to fetch only distinct values using raw SQL or separate distinct queries per column.

### Summary of files to edit
- `src/hooks/useTitulosTudoBelo.ts` — add `.range()` and count query
- `src/hooks/useTitulosParaTestes.ts` — same
- `src/components/TitulosTudoBelo/TitulosPendentesTab.tsx` — server-side pagination
- `src/components/TitulosTudoBelo/TitulosBaixadosTab.tsx` — same
- Any other tab components consuming these hooks

