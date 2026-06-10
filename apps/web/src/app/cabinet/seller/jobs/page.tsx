'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';

interface Job {
  id: string;
  title: string;
  workType: string;
  salary?: number;
  currency: string;
  status: string;
  expiresAt?: string;
  createdAt: string;
}

export default function SellerJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    salary: '',
    currency: 'usd',
    workType: 'Full-time',
    hskLevel: '',
  });
  const router = useRouter();

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const user = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!) : null;
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/jobs?sellerId=${user?.id}`
      );
      setJobs(res.data.data);
    } catch (error) {
      console.error('Failed to fetch jobs');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('fs_access');
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/jobs`,
        {
          ...formData,
          salary: formData.salary ? parseInt(formData.salary) : undefined,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setFormData({ title: '', description: '', salary: '', currency: 'usd', workType: 'Full-time', hskLevel: '' });
      setShowForm(false);
      fetchJobs();
    } catch (error) {
      console.error('Failed to create job');
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    if (!confirm('Are you sure?')) return;
    try {
      const token = localStorage.getItem('fs_access');
      await axios.delete(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/jobs/${jobId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchJobs();
    } catch (error) {
      console.error('Failed to delete job');
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Manage Job Listings</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          {showForm ? 'Cancel' : '+ New Job'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreateJob} className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Job Title (e.g., Senior Developer)"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full border rounded px-3 py-2"
              required
            />
            <textarea
              placeholder="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full border rounded px-3 py-2 h-24"
            />
            <div className="grid grid-cols-2 gap-4">
              <input
                type="number"
                placeholder="Salary (optional)"
                value={formData.salary}
                onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                className="border rounded px-3 py-2"
              />
              <select
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                className="border rounded px-3 py-2"
              >
                <option value="usd">USD</option>
                <option value="cny">CNY</option>
                <option value="rub">RUB</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <select
                value={formData.workType}
                onChange={(e) => setFormData({ ...formData, workType: e.target.value })}
                className="border rounded px-3 py-2"
              >
                <option value="Full-time">Full-time</option>
                <option value="Part-time">Part-time</option>
                <option value="Contract">Contract</option>
                <option value="Remote">Remote</option>
              </select>
              <input
                type="text"
                placeholder="HSK Level (optional)"
                value={formData.hskLevel}
                onChange={(e) => setFormData({ ...formData, hskLevel: e.target.value })}
                className="border rounded px-3 py-2"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700"
            >
              Create Job
            </button>
          </div>
        </form>
      )}

      <div className="space-y-4">
        {jobs.length === 0 ? (
          <div className="bg-gray-100 rounded-lg p-8 text-center">
            <p className="text-gray-600">No jobs posted yet</p>
          </div>
        ) : (
          jobs.map(job => (
            <div key={job.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold">{job.title}</h3>
                  <p className="text-gray-600 text-sm">{job.workType}</p>
                  {job.salary && (
                    <p className="text-green-600 font-bold mt-2">
                      ${job.salary} {job.currency.toUpperCase()}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleDeleteJob(job.id)}
                    className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-4">
                Posted: {new Date(job.createdAt).toLocaleDateString()}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
