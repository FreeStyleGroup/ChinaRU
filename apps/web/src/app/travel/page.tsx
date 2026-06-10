import Link from 'next/link';
export const metadata = { title: 'Travel | China-RU' };
export default function TravelPage() {
  return <div className="min-h-screen bg-gray-50"><div className="max-w-7xl mx-auto px-4 py-12"><Link href="/" className="text-blue-600 mb-6 inline-block">← Home</Link><h1 className="text-4xl font-bold mb-8">Travel Destinations</h1><div className="grid grid-cols-1 md:grid-cols-3 gap-6"><div className="bg-white rounded-lg shadow p-6"><h2 className="text-xl font-bold mb-2">Beijing</h2><p className="text-gray-600">Explore the capital of China</p></div><div className="bg-white rounded-lg shadow p-6"><h2 className="text-xl font-bold mb-2">Shanghai</h2><p className="text-gray-600">Modern metropolis experience</p></div><div className="bg-white rounded-lg shadow p-6"><h2 className="text-xl font-bold mb-2">Xi'an</h2><p className="text-gray-600">Ancient historical sites</p></div></div></div></div>;
}
