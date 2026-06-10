import Link from 'next/link';
export const metadata = { title: 'Horoscope | China-RU' };
export default function HoroscopePage() {
  return <div className="min-h-screen bg-gray-50"><div className="max-w-7xl mx-auto px-4 py-12"><Link href="/" className="text-blue-600 mb-6 inline-block">← Home</Link><h1 className="text-4xl font-bold mb-8">Chinese Zodiac Horoscope</h1><div className="grid grid-cols-2 md:grid-cols-4 gap-4">{'🐀 Rat 🐮 Ox 🐯 Tiger 🐰 Rabbit 🐉 Dragon 🐍 Snake 🐴 Horse 🐑 Goat 🐵 Monkey 🐔 Rooster 🐶 Dog 🐷 Pig'.split(' ').map(z => <div key={z} className="bg-white rounded-lg shadow p-4 text-center"><p className="text-2xl">{z}</p></div>)}</div></div></div>;
}
