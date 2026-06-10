import Link from 'next/link';
export const metadata = { title: 'Cargo Services | China-RU' };
export default function CargoPage() {
  return <div className="min-h-screen bg-gray-50"><div className="max-w-7xl mx-auto px-4 py-12"><Link href="/" className="text-blue-600 mb-6 inline-block">← Home</Link><h1 className="text-4xl font-bold mb-8">Cargo & Logistics</h1><div className="grid grid-cols-1 md:grid-cols-3 gap-6"><div className="bg-white rounded-lg shadow p-6"><p className="text-2xl font-bold">Air Freight</p><p className="text-sm text-gray-600">Fast delivery</p></div><div className="bg-white rounded-lg shadow p-6"><p className="text-2xl font-bold">Sea Freight</p><p className="text-sm text-gray-600">Cost-effective</p></div><div className="bg-white rounded-lg shadow p-6"><p className="text-2xl font-bold">Land Transport</p><p className="text-sm text-gray-600">Regional delivery</p></div></div></div></div>;
}
