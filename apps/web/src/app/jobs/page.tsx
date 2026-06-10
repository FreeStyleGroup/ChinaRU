import Link from 'next/link';
export const metadata = { title: 'Jobs | China-RU' };
export default function JobsPage() {
  return <div className="min-h-screen bg-gray-50"><div className="max-w-7xl mx-auto px-4 py-12"><Link href="/" className="text-blue-600 mb-6 inline-block">← Home</Link><h1 className="text-4xl font-bold mb-8">Job Listings</h1><div className="space-y-4"><div className="bg-white rounded-lg shadow p-6"><h2 className="text-xl font-bold">Senior Developer</h2><p className="text-gray-600">Shanghai | Full-time | HSK Level 4+</p></div><div className="bg-white rounded-lg shadow p-6"><h2 className="text-xl font-bold">Marketing Manager</h2><p className="text-gray-600">Beijing | Full-time | HSK Level 5+</p></div></div></div></div>;
}
