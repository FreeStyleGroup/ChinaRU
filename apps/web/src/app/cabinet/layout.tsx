import Link from 'next/link';

export const metadata = {
  title: 'Cabinet | China-RU',
};

export default function CabinetLayout({ children }: { children: React.ReactNode }) {
  const sidebarItems = [
    { name: 'Dashboard', href: '/cabinet/buyer', icon: '📊' },
    { name: 'Orders', href: '/cabinet/orders', icon: '📦' },
    { name: 'Favorites', href: '/cabinet/favorites', icon: '❤️' },
    { name: 'Messages', href: '/cabinet/messages', icon: '💬' },
    { name: 'Profile', href: '/cabinet/profile', icon: '👤' },
    { name: 'Seller Center', href: '/cabinet/seller', icon: '🏪' },
    { name: 'Admin Panel', href: '/cabinet/admin', icon: '⚙️' },
    { name: 'Settings', href: '/cabinet/settings', icon: '⚙️' },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-white shadow min-h-screen">
          <div className="p-6">
            <h2 className="text-xl font-bold text-gray-900">Personal Cabinet</h2>
          </div>
          <nav className="mt-6">
            {sidebarItems.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-6 py-3 text-gray-700 hover:bg-gray-100 border-l-4 border-transparent hover:border-blue-600"
              >
                <span className="text-xl">{item.icon}</span>
                <span>{item.name}</span>
              </Link>
            ))}
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1">
          <div className="max-w-5xl mx-auto px-6 py-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
