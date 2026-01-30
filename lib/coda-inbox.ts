export interface InboxRow {
  id: string;
  entry: string;
  recordType: string | null;
  title: string | null;
  createdAt: string;
}

export async function fetchInboxItems(): Promise<InboxRow[]> {
  const docId = 'x8nvwL5l1e';
  const tableId = 'grid-P9x9MSRV31';
  const apiToken = process.env.CODA_API_TOKEN;

  if (!apiToken) {
    throw new Error('CODA_API_TOKEN environment variable is required');
  }

  const rows: InboxRow[] = [];
  let pageToken: string | null = null;

  do {
    const url = new URL(`https://coda.io/apis/v1/docs/${docId}/tables/${tableId}/rows`);
    url.searchParams.set('limit', '100');
    url.searchParams.set('sortBy', 'createdAt');
    url.searchParams.set('direction', 'descending');
    if (pageToken) {
      url.searchParams.set('pageToken', pageToken);
    }

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${apiToken}`,
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Coda API error: ${response.status}`);
    }

    const data = await response.json();

    for (const item of data.items) {
      rows.push({
        id: item.id,
        entry: item.values['c-JNxO-bx_kU'] || item.name || '',
        recordType: item.values['c-_y8fi93TKI'] || null,
        title: item.values['c-zQlx72b6vU'] || null,
        createdAt: item.createdAt,
      });
    }

    pageToken = data.nextPageToken || null;
  } while (pageToken);

  return rows;
}

export async function deleteInboxItem(rowId: string): Promise<void> {
  const docId = 'x8nvwL5l1e';
  const tableId = 'grid-P9x9MSRV31';
  const apiToken = process.env.CODA_API_TOKEN;

  if (!apiToken) {
    throw new Error('CODA_API_TOKEN environment variable is required');
  }

  const response = await fetch(
    `https://coda.io/apis/v1/docs/${docId}/tables/${tableId}/rows/${rowId}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${apiToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Coda API error: ${response.status}`);
  }
}
