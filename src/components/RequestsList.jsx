import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from './DashboardLayout';
import Table from './Table';
import Card from './Card';
import { useApi } from '../hooks/useApi';
import { Inbox, FileText, Clock, Plus } from 'lucide-react';

const DASH = '\u2014';
const STATUSES = ['all', 'pending', 'quoted', 'in_progress', 'completed', 'archived'];

export default function RequestsList() {
  const navigate = useNavigate();
  const { request } = useApi();
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let off = false;
    request('/requests-api')
      .then((p) => { if (!off) setRows(p.data || []); })
      .catch((e) => { if (!off) setError(e.message); })
      .finally(() => { if (!off) setLoading(false); });
    return () => { off = true; };
  }, [request]);

  const filtered = filter === 'all' ? rows : rows.filter((r) => r.status === filter);
  const label = (s) => (s || '').split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  const statusClass = (s) =>
    s === 'pending' ? 'bg-amber-100 text-amber-800'
    : s === 'quoted' ? 'bg-blue-100 text-blue-800'
    : s === 'in_progress' ? 'bg-indigo-100 text-indigo-800'
    : s === 'completed' ? 'bg-green-100 text-green-800'
    : 'bg-gray-100 text-gray-600';

  return (
    <DashboardLayout pageTitle="Requests">
      <div className="space-y-6">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            Couldn't load requests: {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-6"><div className="flex justify-between items-start">
            <div><p className="text-sm text-gray-600">Total Enquiries</p>
            <p className="text-3xl font-bold text-gray-900">{rows.length}</p></div>
            <Inbox size={24} className="text-blue-600" /></div></Card>
          <Card className="p-6"><div className="flex justify-between items-start">
            <div><p className="text-sm text-gray-600">Awaiting Quote</p>
            <p className="text-3xl font-bold text-amber-600">
              {rows.filter((r) => r.status === 'pending').length}</p></div>
            <Clock size={24} className="text-amber-600" /></div></Card>
          <Card className="p-6"><div className="flex justify-between items-start">
            <div><p className="text-sm text-gray-600">Quoted</p>
            <p className="text-3xl font-bold text-gray-900">
              {rows.filter((r) => r.status === 'quoted').length}</p></div>
            <FileText size={24} className="text-green-600" /></div></Card>
        </div>

        <div className="flex items-center justify-between gap-4 flex-wrap">
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
          <button onClick={() => navigate('/requests/new')}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 flex items-center gap-2">
            <Plus size={16} /> New Enquiry
          </button>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
          <Table>
            <thead className="bg-gray-50 border-b border-gray-200"><tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Enquiry</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Customer</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Route</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Service</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Needed By</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Quotes</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
            </tr></thead>
            <tbody>
              {loading && <tr><td colSpan="7" className="px-6 py-8 text-center text-gray-500">Loading enquiries...</td></tr>}

              {!loading && filtered.map((r) => (
                <tr key={r.id} onClick={() => navigate(`/requests/${r.id}`)}
                  className="border-b border-gray-200 hover:bg-gray-50 cursor-pointer">
                  <td className="px-6 py-3">
                    <p className="text-sm font-medium text-gray-900">{r.title}</p>
                    {r.requested_by_name && (
                      <p className="text-xs text-gray-500">from {r.requested_by_name}</p>
                    )}
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-600">{r.customer_name || DASH}</td>
                  <td className="px-6 py-3 text-sm text-gray-600 whitespace-nowrap">
                    {r.origin_city && r.destination_city
                      ? `${r.origin_city} \u2192 ${r.destination_city}` : DASH}
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-600">{r.service_type_name || DASH}</td>
                  <td className="px-6 py-3 text-sm text-gray-600 whitespace-nowrap">
                    {r.required_by_date
                      ? new Date(r.required_by_date).toLocaleDateString('en-GB') : DASH}
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-600">
                    {r.quote_count > 0
                      ? <span className="text-blue-600 font-medium">{r.quote_count}</span>
                      : <span className="text-gray-400">none</span>}
                  </td>
                  <td className="px-6 py-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusClass(r.status)}`}>
                      {label(r.status)}
                    </span>
                  </td>
                </tr>
              ))}

              {!loading && filtered.length === 0 && (
                <tr><td colSpan="7" className="px-6 py-8 text-center text-gray-500">No enquiries found</td></tr>
              )}
            </tbody>
          </Table>
        </div>
      </div>
    </DashboardLayout>
  );
}
