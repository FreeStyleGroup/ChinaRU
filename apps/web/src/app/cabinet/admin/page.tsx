'use client';

import Link from 'next/link';

export default function AdminPanelPage() {
  const stats = [
    { label: 'Users', value: '156', icon: '👥' },
    { label: 'Products', value: '1,234', icon: '📦' },
    { label: 'Orders', value: '89', icon: '📋' },
    { label: 'Sellers', value: '34', icon: '🏪' },
  ];

  const modules = [
    { title: '👥 Users Management', desc: 'Manage user accounts, roles, and status' },
    { title: '📋 Orders Management', desc: 'View and manage all marketplace orders' },
    { title: '🏪 Sellers Verification', desc: 'Approve and verify seller accounts' },
    { title: '📦 Products Moderation', desc: 'Review and moderate product listings' },
    { title: '⭐ Reviews Moderation', desc: 'Approve or reject product reviews' },
    { title: '📊 Analytics & Reports', desc: 'View platform metrics and analytics' },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Admin Panel</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {stats.map(stat => (
          <div key={stat.label} className="bg-white rounded-lg shadow p-6">
            <p className="text-3xl font-bold">{stat.icon} {stat.value}</p>
            <p className="text-gray-600 mt-2">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {modules.map((module, idx) => (
          <Link key={idx} href="#" className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition">
            <h2 className="text-lg font-bold mb-2">{module.title}</h2>
            <p className="text-gray-600 text-sm">{module.desc}</p>
          </Link>
        ))}
      </div>

      <div className="mt-8 bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">System Status</h2>
        <div className="space-y-2 text-sm">
          <p>✅ Database: Connected</p>
          <p>✅ Cache: Active</p>
          <p>✅ Search: Operational</p>
          <p>✅ Email: Configured</p>
        </div>
      </div>
    </div>
  );
}
