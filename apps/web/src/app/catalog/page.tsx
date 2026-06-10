import Link from 'next/link';

export const metadata = {
  title: 'Catalog | China-RU',
  description: 'Browse our marketplace catalog',
};

export default function CatalogPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <Link href="/" className="text-blue-600 hover:underline mb-6 inline-block">
          ← Back to Home
        </Link>
        <h1 className="text-4xl font-bold mb-8">Catalog</h1>
        <p className="text-gray-600">Catalog section coming soon...</p>
      </div>
    </div>
  );
}
