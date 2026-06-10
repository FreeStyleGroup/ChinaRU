'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ProtectedPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // In production, this should validate against backend
    const correctPassword = process.env.NEXT_PUBLIC_PROTECTED_PASSWORD || 'china-ru-2026';

    if (password === correctPassword) {
      localStorage.setItem('protected-access', 'true');
      router.push('/');
    } else {
      setError('Invalid password');
      setPassword('');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-red-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-2 text-gray-900">China-RU</h1>
        <p className="text-center text-gray-600 mb-6">International Marketplace</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Access Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
              placeholder="Enter password to continue"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition duration-200"
          >
            Access System
          </button>
        </form>

        <p className="text-center text-gray-500 text-xs mt-6">
          © 2026 China-RU. Development & Testing Version
        </p>
      </div>
    </div>
  );
}
