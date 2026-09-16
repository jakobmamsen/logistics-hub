import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from './DashboardLayout';
import Table from './Table';
import Card from './Card';
import { Package, Ship, AlertCircle } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/.netlify/functions';
const STATUSES = ['all', 'pending', 'active', 'on_hold', 'completed', 'cancelled'];
const DASH = '\u2014';

export default function JobsList() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let off = false;
    fetch(`${API_BASE}/jobs-api`)
      .then((r) => r.json())
      .then((p) => {
        if (off) return;
        if (!p.success) throw new Error(p.error || 'Request failed');
        setJobs(p.data || []);
      })
      .catch((e) => { if (!off) setError(e.message); })
      .finally(() => { if (!off) setLoading(false); });
    return () => { off = true; };
  }, []);

  const filtered = filter === 'all' ? jobs : jobs.filter((j) => j.status === filter);
  const label = (s) => (s || '').split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  const statusClass = (s) =>
    s === 'active' ? 'bg-green-100 text-green-800'
    : s === 'completed' ? 'bg-blue-100 text-blue-800'
    : s === 'on_hold' ? 'bg-amber-100 text-amber-800'
    : s === 'cancelled' ? 'bg-red-100 text-red-800'
    : 'bg-gray-100 text-gray-800';

  return (
    <DashboardLayout pageTitle="Jobs">
      <div className="space-y-6">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            Couldn't load jobs: {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-6"><div className="flex justify-between items-start">
            <div><p className="text-sm text-gray-600">Total Jobs</p>
            <p className="text-3xl font-bold text-gray-900">{jobs.length}</p></div>
            <Package size={24} className="text-blue-600" /></div></Card>
          <Card className="p-6"><div className="flex justify-between items-start">
            <div><p className="text-sm text-gray-600">Active</p>
            <p className="text-3xl font-bold text-gray-900">{jobs.filter((j) => j.status === 'active').length}</p></div>
            <Ship size={24} className="text-green-600" /></div></Card>
          <Card className="p-6"><div className="flex justify-between items-start">
            <div><p className="text-sm text-gray-600">On Hold</p>
            <p className="text-3xl font-bold text-gray-900">{jobs.filter((j) => j.status === 'on_hold').length}</p></div>
            <AlertCircle size={24} className="text-amber-600" /></div></Card>
        </div>

        <div className="flex gap-2 flex-wrap">
          {STATUSES.map((s) => (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                filter === s ? 'bg-blue-600 text-white'
                : 'bg-white border border-gray-200 text-gray-700 hover:border-gray-300'}`}>
              {label(s)}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
          <Table>
            <thead className="bg-gray-50 border-b border-gray-200"><tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Job #</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Customer</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Route</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Service</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Next</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Progress</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
            </tr></thead>
            <tbody>
              {loading && <tr><td colSpan="7" className="px-6 py-8 text-center text-gray-500">Loading jobs...</td></tr>}

              {!loading && filtered.map((job) => (
                <tr key={job.id} onClick={() => navigate(`/jobs/${job.id}`)}
                  className="border-b border-gray-200 hover:bg-gray-50 cursor-pointer">
                  <td className="px-6 py-3 text-sm font-medium text-gray-900">{job.reference_number || DASH}</td>
                  <td className="px-6 py-3 text-sm text-gray-600">{job.customer_name || DASH}</td>
                  <td className="px-6 py-3 text-sm text-gray-600 whitespace-nowrap">
                    {job.origin_code && job.destination_code
                      ? `${job.origin_code} \u2192 ${job.destination_code}` : DASH}
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-600">{job.service_type || DASH}</td>
                  <td className="px-6 py-3 text-sm text-gray-600">
                    {job.next_milestone || DASH}
                    {job.next_milestone_date && (
                      <span className="block text-xs text-gray-400">
                        {new Date(job.next_milestone_date).toLocaleDateString('en-GB')}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-600 whitespace-nowrap">
                    {job.milestones_total > 0
                      ? `${job.milestones_done}/${job.milestones_total}`
                      : DASH}
                  </td>
                  <td className="px-6 py-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusClass(job.status)}`}>
                      {label(job.status)}
                    </span>
                  </td>
                </tr>
              ))}

              {!loading && filtered.length === 0 && (
                <tr><td colSpan="7" className="px-6 py-8 text-center text-gray-500">No jobs found</td></tr>
              )}
            </tbody>
          </Table>
        </div>
      </div>
    </DashboardLayout>
  );
}
