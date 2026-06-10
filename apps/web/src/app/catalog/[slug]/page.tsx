'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import { cartHelper } from '@/lib/cart';

interface Product {
  id: string;
  nameRu: string;
  descriptionRu?: string;
  price: number;
  stock: number;
  rating: number;
  reviewCount: number;
  images: any[];
}

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const res = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/catalog/products/${params.slug}`
        );
        setProduct(res.data.data);
      } catch (error) {
        console.error('Failed to fetch product');
      } finally {
        setLoading(false);
      }
    };

    if (params.slug) {
      fetchProduct();
    }
  }, [params.slug]);

  const handleAddToCart = () => {
    if (product) {
      cartHelper.addItem({
        productId: product.id,
        productName: product.nameRu,
        price: product.price,
        quantity,
      });
      router.push('/cart');
    }
  };

  if (loading) return <div className="max-w-7xl mx-auto px-4 py-12">Loading...</div>;
  if (!product) return <div className="max-w-7xl mx-auto px-4 py-12">Product not found</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <Link href="/catalog" className="text-blue-600 hover:underline mb-6 inline-block">
          ← Back to Catalog
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 bg-white rounded-lg shadow p-8">
          {/* Images */}
          <div>
            <div className="w-full h-96 bg-gray-200 rounded-lg flex items-center justify-center mb-4">
              {product.images[0]?.url ? (
                <img src={product.images[0].url} alt={product.nameRu} className="w-full h-full object-cover rounded-lg" />
              ) : (
                <span className="text-gray-400">No image</span>
              )}
            </div>
            <div className="flex gap-2">
              {product.images.map((img, idx) => (
                <div key={idx} className="w-16 h-16 bg-gray-200 rounded cursor-pointer"></div>
              ))}
            </div>
          </div>

          {/* Details */}
          <div>
            <h1 className="text-4xl font-bold mb-4">{product.nameRu}</h1>

            <div className="flex items-center gap-4 mb-6">
              <span className="text-3xl font-bold text-blue-600">${product.price}</span>
              <span className="text-gray-600">⭐ {product.rating.toFixed(1)} ({product.reviewCount} reviews)</span>
            </div>

            <p className="text-gray-600 mb-6">{product.descriptionRu}</p>

            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Quantity</label>
              <input
                type="number"
                min="1"
                max={product.stock}
                value={quantity}
                onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-20 px-3 py-2 border rounded"
              />
              <p className="text-sm text-gray-600 mt-2">In stock: {product.stock}</p>
            </div>

            <button
              onClick={handleAddToCart}
              disabled={product.stock === 0}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-3 rounded-lg mb-4"
            >
              {product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
            </button>

            <button className="w-full bg-gray-200 hover:bg-gray-300 text-gray-900 font-bold py-3 rounded-lg">
              Save to Favorites ❤️
            </button>
          </div>
        </div>

        {/* Reviews Section */}
        <div className="mt-12 bg-white rounded-lg shadow p-8">
          <h2 className="text-2xl font-bold mb-6">Customer Reviews</h2>
          <p className="text-gray-600">No reviews yet. Be the first to review this product!</p>
        </div>
      </div>
    </div>
  );
}
