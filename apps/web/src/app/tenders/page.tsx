import Link from 'next/link';
export const metadata = { title: 'Tenders | China-RU' };
export default function TendersPage() {
  return <div className="min-h-screen bg-gray-50"><div className="max-w-7xl mx-auto px-4 py-12"><Link href="/" className="text-blue-600 mb-6 inline-block">← Home</Link><h1 className="text-4xl font-bold mb-8">Business Tenders</h1><div className="space-y-4"><div className="bg-white rounded-lg shadow p-6"><h2 className="font-bold">Manufacturing Equipment</h2><p className="text-sm text-gray-600">Deadline: 2026-03-15</p></div><div className="bg-white rounded-lg shadow p-6"><h2 className="font-bold">IT Services</h2><p className="text-sm text-gray-600">Deadline: 2026-03-20</p></div></div></div></div>;
}
