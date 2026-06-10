'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface NavSection {
  title: string;
  items: { name: string; href: string; icon: string }[];
}

const sections: NavSection[] = [
  {
    title: 'Marketplace',
    items: [
      { name: 'Catalog', href: '/catalog', icon: '🛍️' },
      { name: 'Search', href: '/search', icon: '🔍' },
      { name: 'Deals', href: '/deals', icon: '🏷️' },
    ],
  },
  {
    title: 'Services',
    items: [
      { name: 'Travel', href: '/travel', icon: '✈️' },
      { name: 'Jobs', href: '/jobs', icon: '💼' },
      { name: 'Metro Guide', href: '/metro', icon: '🚇' },
      { name: 'Language School', href: '/school', icon: '📚' },
    ],
  },
  {
    title: 'Content',
    items: [
      { name: 'Recipes', href: '/recipes', icon: '🍜' },
      { name: 'Horoscope', href: '/horoscope', icon: '♈' },
      { name: 'Weather', href: '/weather', icon: '🌤️' },
      { name: 'News', href: '/news', icon: '📰' },
    ],
  },
  {
    title: 'Business',
    items: [
      { name: 'Tenders', href: '/tenders', icon: '📋' },
      { name: 'Cargo', href: '/cargo', icon: '📦' },
      { name: 'Stocks', href: '/stocks', icon: '📈' },
      { name: 'Services Check', href: '/checking', icon: '✅' },
    ],
  },
  {
    title: 'Account',
    items: [
      { name: 'My Cabinet', href: '/cabinet/buyer', icon: '👤' },
      { name: 'Seller Center', href: '/cabinet/seller', icon: '🏪' },
      { name: 'Messages', href: '/cabinet/messages', icon: '💬' },
      { name: 'Settings', href: '/cabinet/settings', icon: '⚙️' },
    ],
  },
];

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const hasAccess = localStorage.getItem('protected-access') === 'true';
    const user = localStorage.getItem('user');

    if (!hasAccess) {
      router.push('/protected');
    } else if (!user) {
      // Protected but not logged in - show public home
      setIsLoggedIn(true);
    } else {
      // Logged in user
      setIsLoggedIn(true);
    }
  }, [router]);

  if (!isLoggedIn) return null;

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-4xl font-bold text-blue-600">China-RU</h1>
            <div className="flex gap-4">
              <button
                onClick={() => router.push('/cabinet/buyer')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                My Account
              </button>
              <button
                onClick={() => {
                  localStorage.removeItem('protected-access');
                  router.push('/protected');
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Logout
              </button>
            </div>
          </div>
          <p className="text-gray-600 mt-2">International Marketplace & Services Platform</p>
        </div>
      </header>

      {/* Main Navigation */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {sections.map(section => (
            <div key={section.title} className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-bold mb-4 text-gray-900">{section.title}</h2>
              <ul className="space-y-3">
                {section.items.map(item => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="flex items-center gap-2 text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      <span className="text-2xl">{item.icon}</span>
                      <span className="font-medium">{item.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Quick Stats */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: 'Products', value: '10,000+' },
            { label: 'Sellers', value: '500+' },
            { label: 'Orders Today', value: '250+' },
            { label: 'Users Online', value: '1,200+' },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-lg shadow p-4 text-center">
              <p className="text-3xl font-bold text-blue-600">{stat.value}</p>
              <p className="text-gray-600 text-sm">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
