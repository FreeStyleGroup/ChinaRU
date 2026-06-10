import Link from 'next/link';
export const metadata = { title: 'Recipes | China-RU' };
export default function RecipesPage() {
  return <div className="min-h-screen bg-gray-50"><div className="max-w-7xl mx-auto px-4 py-12"><Link href="/" className="text-blue-600 mb-6 inline-block">← Home</Link><h1 className="text-4xl font-bold mb-8">Chinese Recipes</h1><div className="grid grid-cols-1 md:grid-cols-3 gap-6"><div className="bg-white rounded-lg shadow p-6"><h2 className="font-bold mb-2">Mapo Tofu</h2><p className="text-sm text-gray-600">Spicy tofu dish</p></div><div className="bg-white rounded-lg shadow p-6"><h2 className="font-bold mb-2">Kung Pao Chicken</h2><p className="text-sm text-gray-600">Stir-fried chicken</p></div><div className="bg-white rounded-lg shadow p-6"><h2 className="font-bold mb-2">Peking Duck</h2><p className="text-sm text-gray-600">Traditional Beijing dish</p></div></div></div></div>;
}
