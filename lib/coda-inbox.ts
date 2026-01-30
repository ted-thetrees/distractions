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

// Action type to destination table mapping
// Based on Coda button formulas:
// DI → Distractions | Singles | Data Entry (Link column)
// TA → Talent (Website column)
// IA → LTTT | Inspiring Assets (Source URL column)
// PR → Project Matrix | New Project (Project column)
// MI → LTTT | v5 | Ideas | Meaty (Idea column)
// TS → LTTT | Ideas | Tech Stack (Stack Item column)
// TB → To Buy (Item column, with Magnitude="Inbox")
// DV → Do/Visit (Short Summary column)
// DL → Just delete (no destination)

export type ActionType = 'DI' | 'TA' | 'IA' | 'PR' | 'MI' | 'TS' | 'TB' | 'DV' | 'DL';

interface DestinationConfig {
  tableId: string;
  columnId: string;
  extraColumns?: Record<string, string>;
}

const destinations: Record<Exclude<ActionType, 'DL'>, DestinationConfig> = {
  DI: { tableId: 'grid-t9UDaCw93A', columnId: 'c-V60iC4UaYP' }, // Distractions | Singles | Data Entry - Link
  TA: { tableId: 'grid-nWL5HfnVj7', columnId: 'c-xM7Hq_0MZ8' }, // Talent - Website
  IA: { tableId: 'grid-7qiggjHCXv', columnId: 'c-lw-8F3lcSC' }, // LTTT | Inspiring Assets | All - Source URL
  PR: { tableId: 'table-h6bTek4xQC', columnId: 'c-Z599iCiqKT' }, // Project Matrix | New Project - Project
  MI: { tableId: 'grid-UtaAByauBo', columnId: 'c-R1DC_wYTPy' }, // LTTT | Ideas | Meaty - Idea
  TS: { tableId: 'grid-HtQrEdOIqh', columnId: 'c-R1DC_wYTPy' }, // INF | Ideas | Tech Stack - Stack Item
  TB: { tableId: 'table-nV15ULr9Ln', columnId: 'c-DRJDhlMaqs', extraColumns: { 'c-wnGNftGEny': 'Inbox' } }, // To Buy - Item (Magnitude=Inbox)
  DV: { tableId: 'grid-xJGIAsjYqj', columnId: 'c-zAi5pOva7H' }, // Do/Visit - Short Summary
};

export async function processInboxAction(
  rowId: string,
  action: ActionType,
  entryContent: string
): Promise<void> {
  const docId = 'x8nvwL5l1e';
  const apiToken = process.env.CODA_API_TOKEN;

  if (!apiToken) {
    throw new Error('CODA_API_TOKEN environment variable is required');
  }

  // If it's just delete, skip adding to destination
  if (action !== 'DL') {
    const destination = destinations[action];

    // Build the row data for the destination table
    const cells = [
      { column: destination.columnId, value: entryContent }
    ];

    // Add any extra columns (like Magnitude for To Buy)
    if (destination.extraColumns) {
      for (const [colId, value] of Object.entries(destination.extraColumns)) {
        cells.push({ column: colId, value });
      }
    }

    // Add row to destination table
    const addResponse = await fetch(
      `https://coda.io/apis/v1/docs/${docId}/tables/${destination.tableId}/rows`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rows: [{ cells }],
        }),
      }
    );

    if (!addResponse.ok) {
      const errorText = await addResponse.text();
      throw new Error(`Failed to add to destination: ${addResponse.status} - ${errorText}`);
    }
  }

  // Delete from Inbox
  await deleteInboxItem(rowId);
}
