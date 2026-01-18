export interface CodaRow {
  id: string;
  name: string;
  link: string;
  image: string;
  scale: number | string;
  status: string;
}

export async function fetchDistractions(): Promise<CodaRow[]> {
  const docId = 'x8nvwL5l1e';
  const tableId = 'grid-t9UDaCw93A';
  const apiToken = process.env.CODA_API_TOKEN;

  if (!apiToken) {
    throw new Error('CODA_API_TOKEN environment variable is required');
  }

  const rows: CodaRow[] = [];
  let pageToken: string | null = null;

  do {
    const url = new URL(`https://coda.io/apis/v1/docs/${docId}/tables/${tableId}/rows`);
    url.searchParams.set('limit', '100');
    if (pageToken) {
      url.searchParams.set('pageToken', pageToken);
    }

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${apiToken}`,
      },
      next: { revalidate: 60 }, // Cache for 60 seconds
    });

    if (!response.ok) {
      throw new Error(`Coda API error: ${response.status}`);
    }

    const data = await response.json();

    for (const item of data.items) {
      // Only include "Live" status items
      const status = item.values['c-39S1Z-7QdP'] || '';
      if (status !== 'Live') continue;

      rows.push({
        id: item.id,
        name: item.values['c-yrhJnxU2ns'] || '',
        link: item.values['c-V60iC4UaYP'] || '',
        image: item.values['c-R5LP8UaCQf'] || '',
        scale: item.values['c-q3eAZofAM0'] || 0,
        status: status,
      });
    }

    pageToken = data.nextPageToken || null;
  } while (pageToken);

  return rows;
}
