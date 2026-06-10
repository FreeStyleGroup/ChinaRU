export const metadata = {
  title: 'Buyer Dashboard | China-RU',
};

export default function BuyerDashboardPage() {
  const stats = [
    { label: 'Total Orders', value: '12', icon: '📦' },
    { label: 'Spent', value: '$1,234', icon: '💰' },
    { label: 'Favorites', value: '28', icon: '❤️' },
    { label: 'Unread Messages', value: '3', icon: '💬' },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Welcome to Your Buyer Cabinet</h1>

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
