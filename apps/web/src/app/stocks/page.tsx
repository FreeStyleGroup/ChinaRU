import Link from 'next/link';
export const metadata = { title: 'Stock Market | China-RU' };
export default function StocksPage() {
  return <div className="min-h-screen bg-gray-50"><div className="max-w-7xl mx-auto px-4 py-12"><Link href="/" className="text-blue-600 mb-6 inline-block">← Home</Link><h1 className="text-4xl font-bold mb-8">China Stock Market</h1><div className="space-y-4"><div className="bg-white rounded-lg shadow p-6 flex justify-between"><div><h2 className="font-bold">Alibaba (BABA)</h2><p className="text-gray-600 text-sm">E-commerce</p></div><p className="text-2xl font-bold text-green-600">$95.50</p></div><div className="bg-white rounded-lg shadow p-6 flex justify-between"><div><h2 className="font-bold">Tencent (0700)</h2><p className="text-gray-600 text-sm">Technology</p></div><p className="text-2xl font-bold text-green-600">$38.20</p></div></div></div></div>;
}
