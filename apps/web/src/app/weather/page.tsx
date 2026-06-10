import Link from 'next/link';
export const metadata = { title: 'Weather | China-RU' };
export default function WeatherPage() {
  return <div className="min-h-screen bg-gray-50"><div className="max-w-7xl mx-auto px-4 py-12"><Link href="/" className="text-blue-600 mb-6 inline-block">← Home</Link><h1 className="text-4xl font-bold mb-8">Weather in China</h1><div className="grid grid-cols-1 md:grid-cols-3 gap-6"><div className="bg-white rounded-lg shadow p-6"><h2 className="font-bold mb-4">Beijing</h2><p className="text-3xl mb-2">15°C</p><p className="text-gray-600">Partly Cloudy</p></div><div className="bg-white rounded-lg shadow p-6"><h2 className="font-bold mb-4">Shanghai</h2><p className="text-3xl mb-2">22°C</p><p className="text-gray-600">Sunny</p></div><div className="bg-white rounded-lg shadow p-6"><h2 className="font-bold mb-4">Guangzhou</h2><p className="text-3xl mb-2">28°C</p><p className="text-gray-600">Rainy</p></div></div></div></div>;
}
