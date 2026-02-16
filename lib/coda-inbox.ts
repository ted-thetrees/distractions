export interface InboxRow {
  id: string;
  entry: string;
  recordType: string | null;
  title: string | null;
  createdAt: string;
}

export interface InboxPageResult {
  items: InboxRow[];
  nextPageToken: string | null;
}

export async function fetchInboxItems(
  limit: number = 25,
  pageToken?: string
): Promise<InboxPageResult> {
  const docId = 'x8nvwL5l1e';
  const tableId = 'grid-P9x9MSRV31';
  const apiToken = process.env.CODA_API_TOKEN;

  if (!apiToken) {
    throw new Error('CODA_API_TOKEN environment variable is required');
  }

  const url = new URL(`https://coda.io/apis/v1/docs/${docId}/tables/${tableId}/rows`);
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('sortBy', 'createdAt');
  url.searchParams.set('direction', 'descending');
  // Filter to only rows where entry contains "youtube" (catches youtube.com and youtu.be)
  url.searchParams.set('query', 'youtube');
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

  const items: InboxRow[] = data.items.map((item: Record<string, unknown>) => ({
    id: item.id,
    entry: (item.values as Record<string, string>)['c-JNxO-bx_kU'] || item.name || '',
    recordType: (item.values as Record<string, string>)['c-_y8fi93TKI'] || null,
    title: (item.values as Record<string, string>)['c-zQlx72b6vU'] || null,
    createdAt: item.createdAt,
  }));

  return {
    items,
    nextPageToken: data.nextPageToken || null,
  };
}
