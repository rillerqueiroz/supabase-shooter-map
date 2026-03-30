const DEFAULT_BATCH_SIZE = 500;

type SupabaseBatchResult<T> = {
  data: T[] | null;
  error: unknown;
};

export async function fetchAllSupabaseRows<T>(
  fetchPage: (from: number, to: number) => Promise<SupabaseBatchResult<T>>,
  batchSize: number = DEFAULT_BATCH_SIZE,
): Promise<T[]> {
  const rows: T[] = [];

  for (let from = 0; ; from += batchSize) {
    const to = from + batchSize - 1;
    const { data, error } = await fetchPage(from, to);

    if (error) {
      throw error;
    }

    const batch = data ?? [];
    rows.push(...batch);

    if (batch.length < batchSize) {
      break;
    }
  }

  return rows;
}

export function chunkArray<T>(items: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize));
  }

  return chunks;
}