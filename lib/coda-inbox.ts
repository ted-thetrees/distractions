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
  TA: { tableId: 'grid-qjPOxmqvq9', columnId: 'c-0FiLOYm4ER' }, // Talent - Website
  IA: { tableId: 'grid-WRl6HLJeKf', columnId: 'c-A-5TQpIj6O' }, // Inspiring Assets - Source URL
  PR: { tableId: 'grid-yTcLZeEBvR', columnId: 'c-EfDd8F6oDn' }, // Project Matrix | New Project - Project
  MI: { tableId: 'grid-xjB5kLBqX5', columnId: 'c-xjTcM5FIgQ' }, // Meaty Ideas - Idea
  TS: { tableId: 'grid-LHJa0mBqtH', columnId: 'c-0IkEQLpKlL' }, // Tech Stack - Stack Item
  TB: { tableId: 'grid-QJc4O0aHvM', columnId: 'c-AUALuPyujS', extraColumns: { 'c-sHqXLxlMPy': 'Inbox' } }, // To Buy - Item (Magnitude=Inbox)
  DV: { tableId: 'grid-pV8HH7SBX3', columnId: 'c-Q9Jjg-NZg2' }, // Do/Visit - Short Summary
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
