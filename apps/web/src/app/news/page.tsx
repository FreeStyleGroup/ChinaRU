import Link from 'next/link';
export const metadata = { title: 'News | China-RU' };
export default function NewsPage() {
  return <div className="min-h-screen bg-gray-50"><div className="max-w-7xl mx-auto px-4 py-12"><Link href="/" className="text-blue-600 mb-6 inline-block">← Home</Link><h1 className="text-4xl font-bold mb-8">Latest News</h1><div className="space-y-4"><div className="bg-white rounded-lg shadow p-6"><h2 className="font-bold mb-2">Market Update</h2><p className="text-gray-600 text-sm">Today at 10:30</p></div><div className="bg-white rounded-lg shadow p-6"><h2 className="font-bold mb-2">New Regulations</h2><p className="text-gray-600 text-sm">Yesterday</p></div></div></div></div>;
}
