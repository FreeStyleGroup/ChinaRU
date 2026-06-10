'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import axios from 'axios';

interface Job {
  id: string;
  sellerName: string;
  title: string;
  titleCn?: string;
  description?: string;
  salary?: number;
  currency: string;
  workType: string;
  hskLevel?: string;
  status: string;
  expiresAt?: string;
  createdAt: string;
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const res = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/jobs`
        );
        setJobs(res.data.data);
      } catch (error) {
        console.error('Failed to fetch jobs');
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();
  }, []);

  if (loading) return <div className="max-w-7xl mx-auto px-4 py-12">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <Link href="/" className="text-blue-600 mb-6 inline-block">← Home</Link>

        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">💼 Job Listings</h1>
          <p className="text-gray-600">{jobs.length} open positions</p>
        </div>

        {jobs.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600">No jobs available at the moment</p>
          </div>
        ) : (
          <div className="space-y-4">
            {jobs.map(job => (
              <div key={job.id} className="bg-white rounded-lg shadow hover:shadow-lg transition p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-xl font-bold">{job.title}</h2>
                    {job.titleCn && <p className="text-gray-600 text-sm">{job.titleCn}</p>}
                    <p className="text-sm text-blue-600 mt-1">From: {job.sellerName}</p>
                  </div>
                  {job.salary && (
                    <div className="text-right">
                      <p className="text-2xl font-bold text-green-600">${job.salary}</p>
                      <p className="text-sm text-gray-600">{job.currency.toUpperCase()}</p>
                    </div>
                  )}
                </div>

                {job.description && (
                  <p className="text-gray-700 mb-4">{job.description}</p>
                )}

                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                    {job.workType}
                  </span>
                  {job.hskLevel && (
                    <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm">
                      HSK {job.hskLevel}
                    </span>
                  )}
                  {job.expiresAt && (
                    <span className="text-xs text-gray-500">
                      Expires: {new Date(job.expiresAt).toLocaleDateString()}
                    </span>
                  )}
                </div>

                <button className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition">
                  Apply Now
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
