import Link from 'next/link';
export const metadata = { title: 'Search | China-RU' };
export default function SearchPage() {
  return <div className="min-h-screen bg-gray-50"><div className="max-w-7xl mx-auto px-4 py-12"><Link href="/" className="text-blue-600 mb-6 inline-block">← Home</Link><h1 className="text-4xl font-bold mb-8">Search Marketplace</h1><div className="bg-white rounded-lg shadow p-6"><form className="space-y-4"><input type="text" placeholder="Search products, sellers, services..." className="w-full border rounded px-3 py-2" /><button className="bg-blue-600 text-white px-6 py-2 rounded">Search</button></form></div><div className="mt-8 space-y-4"><div className="bg-white rounded-lg shadow p-4"><p className="font-bold">Recent searches</p></div></div></div></div>;
}
