import Link from 'next/link';
export const metadata = { title: 'Services Check | China-RU' };
export default function CheckingPage() {
  return <div className="min-h-screen bg-gray-50"><div className="max-w-7xl mx-auto px-4 py-12"><Link href="/" className="text-blue-600 mb-6 inline-block">← Home</Link><h1 className="text-4xl font-bold mb-8">Company Verification</h1><div className="bg-white rounded-lg shadow p-6"><form className="space-y-4"><input type="text" placeholder="Company name" className="w-full border rounded px-3 py-2" /><button className="bg-blue-600 text-white px-6 py-2 rounded">Verify Company</button></form></div></div></div>;
}
