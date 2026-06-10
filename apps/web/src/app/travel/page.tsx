'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import axios from 'axios';

interface Destination {
  id: string;
  slug: string;
  nameRu: string;
  description?: string;
  attractions?: string[];
}

interface Package {
  id: string;
  titleRu: string;
  price: number;
  duration: number;
}

export default function TravelPage() {
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [destRes, pkgRes] = await Promise.all([
          axios.get(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/travel/destinations`),
          axios.get(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/travel/packages`),
        ]);

        setDestinations(destRes.data.data);
        setPackages(pkgRes.data.data);
      } catch (error) {
        console.error('Failed to fetch travel data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <div className="max-w-7xl mx-auto px-4 py-12">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <Link href="/" className="text-blue-600 mb-6 inline-block">← Home</Link>

        <h1 className="text-4xl font-bold mb-8">✈️ Travel Destinations</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {destinations.map(dest => (
            <div key={dest.id} className="bg-white rounded-lg shadow hover:shadow-lg transition p-6">
              <h2 className="text-xl font-bold mb-2">{dest.nameRu}</h2>
              <p className="text-gray-600 mb-4">{dest.description}</p>
              {dest.attractions && (
                <ul className="text-sm text-gray-600 space-y-1">
                  {dest.attractions.slice(0, 3).map((attr, idx) => (
                    <li key={idx}>• {attr}</li>
                  ))}
                </ul>
              )}
              <button className="mt-4 w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">
                Book Now
              </button>
            </div>
          ))}
        </div>

        <h2 className="text-3xl font-bold mb-6">📦 Travel Packages</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {packages.map(pkg => (
            <div key={pkg.id} className="bg-white rounded-lg shadow p-6">
              <h3 className="text-xl font-bold mb-2">{pkg.titleRu}</h3>
              <p className="text-gray-600 mb-4">Duration: {pkg.duration} days</p>
              <p className="text-2xl font-bold text-blue-600">${pkg.price}</p>
              <button className="mt-4 w-full bg-green-600 text-white py-2 rounded hover:bg-green-700">
                Learn More
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
