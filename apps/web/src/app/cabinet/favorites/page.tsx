'use client';

import { useState } from 'react';
import Link from 'next/link';

interface Favorite {
  id: string;
  productId: string;
  productName: string;
  price: number;
  image?: string;
}

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<Favorite[]>([]);

  const handleRemove = (productId: string) => {
    setFavorites(favorites.filter(f => f.productId !== productId));
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">My Favorites</h1>

      {favorites.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <p className="text-gray-600 mb-4">No favorites yet</p>
          <Link href="/catalog" className="text-blue-600 hover:underline">
            Browse catalog →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {favorites.map(item => (
            <div key={item.id} className="bg-white rounded-lg shadow">
              <div className="h-40 bg-gray-200"></div>
              <div className="p-4">
                <h3 className="font-bold line-clamp-2 mb-2">{item.productName}</h3>
                <p className="text-blue-600 font-bold mb-4">${item.price.toFixed(2)}</p>
                <button
                  onClick={() => handleRemove(item.productId)}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  Remove from favorites
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
