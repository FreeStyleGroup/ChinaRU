import Link from 'next/link';
export const metadata = { title: 'Metro Guide | China-RU' };
export default function MetroPage() {
  return <div className="min-h-screen bg-gray-50"><div className="max-w-7xl mx-auto px-4 py-12"><Link href="/" className="text-blue-600 mb-6 inline-block">← Home</Link><h1 className="text-4xl font-bold mb-8">Metro Guide</h1><div className="grid grid-cols-1 md:grid-cols-2 gap-6"><div className="bg-white rounded-lg shadow p-6"><h2 className="font-bold mb-2">Beijing Subway</h2><p className="text-gray-600">16 lines, 370+ stations</p></div><div className="bg-white rounded-lg shadow p-6"><h2 className="font-bold mb-2">Shanghai Metro</h2><p className="text-gray-600">17 lines, 400+ stations</p></div></div></div></div>;
}
