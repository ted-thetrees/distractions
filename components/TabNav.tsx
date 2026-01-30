import Link from 'next/link';

interface TabNavProps {
  activeTab: 'distractions' | 'inbox';
}

export default function TabNav({ activeTab }: TabNavProps) {
  return (
    <nav className="tab-nav">
      <Link
        href="/"
        className={`tab-link ${activeTab === 'distractions' ? 'active' : ''}`}
      >
        Distractions
      </Link>
      <Link
        href="/inbox"
        className={`tab-link ${activeTab === 'inbox' ? 'active' : ''}`}
      >
        Lobster
      </Link>
    </nav>
  );
}
