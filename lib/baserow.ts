export interface DistractionRow {
  id: number;
  entry: string;
  type: string | null;
  hidden: boolean;
  createdOn: string | null;
}

export async function fetchDistractions(): Promise<DistractionRow[]> {
  const tableId = 809876;
  const apiToken = process.env.BASEROW_API_TOKEN;

  if (!apiToken) {
    throw new Error('BASEROW_API_TOKEN environment variable is required');
  }

  const rows: DistractionRow[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const url = new URL(`https://api.baserow.io/api/database/rows/table/${tableId}/`);
    url.searchParams.set('user_field_names', 'true');
    url.searchParams.set('size', '100');
    url.searchParams.set('page', String(page));
    // Filter out hidden rows and sort by newest first
    url.searchParams.set('filter__Hidden__boolean', 'false');
    url.searchParams.set('order_by', '-Created On');

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Token ${apiToken}`,
      },
      next: { revalidate: 60 }, // Cache for 60 seconds
    });

    if (!response.ok) {
      throw new Error(`Baserow API error: ${response.status}`);
    }

    const data = await response.json();

    for (const item of data.results) {
      rows.push({
        id: item.id,
        entry: item.Entry || '',
        type: item.Type?.value || null,
        hidden: item.Hidden || false,
        createdOn: item['Created On'] || null,
      });
    }

    hasMore = data.next !== null;
    page++;
  }

  return rows;
}

export async function hideDistraction(rowId: number): Promise<void> {
  const tableId = 809876;
  const apiToken = process.env.BASEROW_API_TOKEN;

  if (!apiToken) {
    throw new Error('BASEROW_API_TOKEN environment variable is required');
  }

  const response = await fetch(
    `https://api.baserow.io/api/database/rows/table/${tableId}/${rowId}/?user_field_names=true`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Token ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ Hidden: true }),
    }
  );

  if (!response.ok) {
    throw new Error(`Baserow API error: ${response.status}`);
  }
}
