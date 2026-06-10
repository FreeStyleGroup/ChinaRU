'use client';

import Link from 'next/link';

export default function SellerCenterPage() {
  const stats = [
    { label: 'Products', value: '0', icon: '📦' },
    { label: 'Sales', value: '0', icon: '💰' },
    { label: 'Revenue', value: '$0', icon: '💵' },
    { label: 'Rating', value: '5.0', icon: '⭐' },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Seller Center</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {stats.map(stat => (
          <div key={stat.label} className="bg-white rounded-lg shadow p-6">
            <p className="text-3xl font-bold">{stat.icon} {stat.value}</p>
            <p className="text-gray-600 mt-2">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link href="#" className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition">
          <h2 className="text-xl font-bold mb-2">📦 Manage Products</h2>
          <p className="text-gray-600">Add, edit, and remove products</p>
        </Link>

        <Link href="#" className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition">
          <h2 className="text-xl font-bold mb-2">📋 Seller Orders</h2>
          <p className="text-gray-600">View orders from your customers</p>
        </Link>

        <Link href="#" className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition">
          <h2 className="text-xl font-bold mb-2">💰 Payouts</h2>
          <p className="text-gray-600">Manage withdrawals and earnings</p>
        </Link>

        <Link href="#" className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition">
          <h2 className="text-xl font-bold mb-2">📊 Analytics</h2>
          <p className="text-gray-600">View sales and performance metrics</p>
        </Link>
      </div>
    </div>
  );
}
