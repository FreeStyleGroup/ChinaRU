export const metadata = {
  title: 'Buyer Dashboard | China-RU',
};

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

export default function BuyerDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/auth/login');
    } else {
      setUser(JSON.parse(userData));
    }
  }, [router]);

  if (!user) return null;

  const stats = [
    { label: 'Total Orders', value: '0', icon: '📦' },
    { label: 'Spent', value: '$0', icon: '💰' },
    { label: 'Favorites', value: '0', icon: '❤️' },
    { label: 'Unread Messages', value: '0', icon: '💬' },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">Welcome, {user.name}! 👋</h1>
      <p className="text-gray-600 mb-8">{user.email}</p>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {stats.map(stat => (
          <div key={stat.label} className="bg-white rounded-lg shadow p-6">
            <p className="text-4xl mb-2">{stat.icon}</p>
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            <p className="text-gray-600">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Orders */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Recent Orders</h2>
          <div className="text-gray-600">No orders yet</div>
        </div>

        {/* Saved Favorites */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Saved Favorites</h2>
          <div className="text-gray-600">No favorites yet</div>
        </div>
      </div>
    </div>
  );
}
