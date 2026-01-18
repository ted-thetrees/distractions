import { fetchDistractions } from '@/lib/coda';
import Card from '@/components/Card';

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
        <div className="feed">
          {items.map((item) => (
            <Card
              key={item.id}
              name={item.name}
              link={item.link}
              image={item.image}
            />
          ))}
        </div>
      )}
    </main>
  );
}
