export interface DistractionRow {
  id: number;
  entry: string;
  type: string | null;
  archived: boolean;
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
    // Filter out archived rows and sort by newest first
    // Archived is a single select field with options: "Yes" (5100881), "No" (5100882)
    // Use single_select_not_equal with the option ID (not string value)
    url.searchParams.set('filter__Archived__single_select_not_equal', '5100881');
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
        archived: item.Archived?.value === 'Yes',
        createdOn: item['Created On'] || null,
      });
    }

    hasMore = data.next !== null;
    page++;
  }

  return rows;
}

export async function archiveDistraction(rowId: number): Promise<void> {
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
      // Archived is a single select field - set to "Yes" to archive
      body: JSON.stringify({ Archived: 'Yes' }),
    }
  );

  if (!response.ok) {
    throw new Error(`Baserow API error: ${response.status}`);
  }
}
