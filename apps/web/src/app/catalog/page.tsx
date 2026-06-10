'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import axios from 'axios';

interface Product {
  id: string;
  slug: string;
  nameRu: string;
  price: number;
  rating: number;
  reviewCount: number;
  images: any[];
}

export default function CatalogPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('new');

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/catalog/products?search=${search}&sortBy=${sortBy}`
        );
        setProducts(res.data.data.data);
      } catch (error) {
        console.error('Failed to fetch products');
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [search, sortBy]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <Link href="/" className="text-blue-600 hover:underline mb-6 inline-block">
          ← Home
        </Link>

        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">Catalog</h1>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            className="px-4 py-2 border rounded"
          >
            <option value="new">Newest</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="rating">Best Rated</option>
          </select>
        </div>

        <input
          type="text"
          placeholder="Search products..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full px-4 py-2 border rounded-lg mb-8"
        />

        {loading ? (
          <p className="text-gray-600">Loading...</p>
        ) : products.length === 0 ? (
          <p className="text-gray-600">No products found</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.map(product => (
              <Link
                key={product.id}
                href={`/catalog/${product.slug}`}
                className="bg-white rounded-lg shadow hover:shadow-lg transition"
              >
                <div className="h-40 bg-gray-200 rounded-t-lg flex items-center justify-center">
                  {product.images[0]?.url ? (
                    <img src={product.images[0].url} alt={product.nameRu} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-gray-400">No image</span>
                  )}
                </div>
                <div className="p-4">
                  <h2 className="font-bold text-lg mb-2 line-clamp-2">{product.nameRu}</h2>
                  <div className="flex justify-between items-center">
                    <span className="text-blue-600 font-bold text-xl">${product.price}</span>
                    <span className="text-sm text-gray-600">⭐ {product.rating.toFixed(1)}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">{product.reviewCount} reviews</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
