import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from './DashboardLayout';
import Table from './Table';
import Card from './Card';
import { Plus, DollarSign, FileText , Download, Pencil } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/.netlify/functions';

const STATUSES = ['all', 'draft', 'submitted', 'approved', 'sent', 'won', 'lost'];

export default function QuotesList() {
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchQuotes() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_BASE}/quotes-api`, {
          headers: { 'Content-Type': 'application/json' },
        });

        if (!res.ok) {
          throw new Error(`${res.status} ${res.statusText}`);
        }

        const payload = await res.json();
        const rows = Array.isArray(payload)
          ? payload
          : payload.data ?? payload.quotes ?? [];

        if (!cancelled) setQuotes(rows);
      } catch (err) {
        console.error('Failed to load quotes:', err);
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchQuotes();
    return () => { cancelled = true; };
  }, []);

  const filteredQuotes =
    filter === 'all' ? quotes : quotes.filter((q) => q.status === filter);

  const sellTotal = (q) => q.sell_total ?? null;

  const money = (v) =>
    v == null
      ? '\u2014'
      : new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'EUR',
          maximumFractionDigits: 0,
        }).format(v);

  async function downloadPdf(quote) {
    try {
      const res = await fetch(`${API_BASE}/quote-pdf?id=${quote.id}`);
      if (!res.ok) {
        const msg = await res.json().catch(() => null);
        throw new Error(msg?.error || `PDF failed (${res.status})`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${quote.reference_number}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e.message);
    }
  }

  const customerName = (q) => q.customer_name ?? '\u2014';

  return (
    <DashboardLayout pageTitle="Quotes">
      <div className="space-y-6">

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            Couldn't load quotes: {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-gray-600">Total Quotes</p>
                <p className="text-3xl font-bold text-gray-900">{quotes.length}</p>
              </div>
              <FileText size={24} className="text-blue-600" />
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-gray-600">Approved</p>
                <p className="text-3xl font-bold text-gray-900">
                  {quotes.filter((q) => q.status === 'approved').length}
                </p>
              </div>
              <DollarSign size={24} className="text-green-600" />
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-gray-600">Draft</p>
                <p className="text-3xl font-bold text-gray-900">
                  {quotes.filter((q) => q.status === 'draft').length}
                </p>
              </div>
              <Plus size={24} className="text-gray-500" />
            </div>
          </Card>
        </div>

        <div className="flex justify-end">
          <button
            onClick={() => navigate('/quotes/new')}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus size={16} /> New Quote
          </button>
        </div>

        <div className="flex gap-2 mb-4 flex-wrap">
          {STATUSES.map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                filter === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-700 hover:border-gray-300'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <Table>
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Quote #</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Created</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Sell Total</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase">PDF</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                    Loading quotes...
                  </td>
                </tr>
              )}

              {!loading && filteredQuotes.map((quote) => (
                <tr
                  key={quote.id}
                  className="border-b border-gray-200 hover:bg-gray-50 cursor-pointer"
                >
                  <td className="px-6 py-3 text-sm font-medium text-gray-900">
                    {quote.reference_number ?? '\u2014'}
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-600">
                    {customerName(quote)}
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-600">
                    {quote.created_at
                      ? new Date(quote.created_at).toLocaleDateString('en-GB')
                      : '\u2014'}
                  </td>
                  <td className="px-6 py-3">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        quote.status === 'won' || quote.status === 'approved'
                          ? 'bg-green-100 text-green-800'
                          : quote.status === 'sent' || quote.status === 'submitted'
                          ? 'bg-blue-100 text-blue-800'
                          : quote.status === 'lost' || quote.status === 'rejected'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {(quote.status ?? 'draft').charAt(0).toUpperCase() +
                        (quote.status ?? 'draft').slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-right text-sm font-medium text-gray-900">
                    {money(sellTotal(quote))}
                  </td>
                  <td className="px-6 py-3 text-center whitespace-nowrap">
                    <button
                      onClick={(e) => { e.stopPropagation(); navigate(`/quotes/${quote.id}`); }}
                      title="Edit quote"
                      className="p-1.5 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition mr-1"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); downloadPdf(quote); }}
                      title={`Download ${quote.reference_number}.pdf`}
                      className="p-1.5 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition"
                    >
                      <Download size={16} />
                    </button>
                  </td>
                </tr>
              ))}

              {!loading && filteredQuotes.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                    No quotes found
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </div>
      </div>
    </DashboardLayout>
  );
}
