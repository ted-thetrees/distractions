import { fetchInboxItems } from '@/lib/coda-inbox';
import InboxFeed from '@/components/InboxFeed';

export const dynamic = 'force-dynamic';

export default async function InboxPage() {
  let result: Awaited<ReturnType<typeof fetchInboxItems>> | null = null;
  let error: string | null = null;

  try {
    result = await fetchInboxItems(25);
  } catch (e) {
    error = e instanceof Error ? e.message : 'Failed to load';
  }

  return (
    <main>
      <header className="header">
        <h1>Lobster</h1>
      </header>

      {error ? (
        <div className="loading">{error}</div>
      ) : !result || result.items.length === 0 ? (
        <div className="loading">No videos in inbox</div>
      ) : (
        <InboxFeed
          initialItems={result.items}
          initialNextPageToken={result.nextPageToken}
        />
      )}
    </main>
  );
}
