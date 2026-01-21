import { fetchDistractions } from '@/lib/baserow';
import Feed from '@/components/Feed';

export const revalidate = 60; // Revalidate every 60 seconds

export default async function Home() {
  let items: Awaited<ReturnType<typeof fetchDistractions>> = [];
  let error: string | null = null;

  try {
    items = await fetchDistractions();
  } catch (e) {
    error = e instanceof Error ? e.message : 'Failed to load';
  }

  return (
    <main>
      <header className="header">
        <h1>Distractions</h1>
      </header>

      {error ? (
        <div className="loading">{error}</div>
      ) : items.length === 0 ? (
        <div className="loading">No items found</div>
      ) : (
        <Feed initialItems={items} />
      )}
    </main>
  );
}
