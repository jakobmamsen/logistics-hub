import React, { useState, useEffect } from 'react';
import DashboardLayout from './DashboardLayout';
import { useApi } from '../hooks/useApi';
import Button from './Button';
import Table from './Table';
import Card from './Card';
import { Plus, DollarSign } from 'lucide-react';

export default function QuotesList() {
  const { request } = useApi();
  const [quotes, setQuotes] = useState([]);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const fetchQuotes = async () => {
      try {
        const response = await request('/api/quotes');
        if (response.success) {
          setQuotes(response.data || []);
        }
      } catch (err) {
        console.error('Failed to load quotes:', err);
      }
    };
    fetchQuotes();
  }, [request]);

  const filteredQuotes = filter === 'all' ? quotes : quotes.filter(q => q.status === filter);

  return (
    <DashboardLayout pageTitle="Quotes">
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-gray-600">Total Quotes</p>
                <p className="text-3xl font-bold text-gray-900">{quotes.length}</p>
              </div>
              <Plus size={24} className="text-blue-600" />
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-gray-600">Active (Sent)</p>
                <p className="text-3xl font-bold text-gray-900">{quotes.filter(q => q.status === 'sent').length}</p>
              </div>
              <DollarSign size={24} className="text-green-600" />
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-gray-600">Accepted</p>
                <p className="text-3xl font-bold text-gray-900">{quotes.filter(q => q.status === 'accepted').length}</p>
              </div>
              <DollarSign size={24} className="text-green-600" />
            </div>
          </Card>
        </div>

        <div className="flex gap-2 mb-4">
          {['all', 'draft', 'sent', 'accepted', 'rejected'].map(status => (
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
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Client</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Route</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Amount</th>
              </tr>
            </thead>
            <tbody>
              {filteredQuotes.map((quote, idx) => (
                <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50 cursor-pointer">
                  <td className="px-6 py-3 text-sm font-medium text-gray-900">{quote.quote_number || 'QT-' + (idx + 1)}</td>
                  <td className="px-6 py-3 text-sm text-gray-600">{quote.client_name || 'Unknown'}</td>
                  <td className="px-6 py-3 text-sm text-gray-600">Shanghai → Hamburg</td>
                  <td className="px-6 py-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      quote.status === 'accepted' ? 'bg-green-100 text-green-800' :
                      quote.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                      quote.status === 'rejected' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {(quote.status || 'draft').charAt(0).toUpperCase() + (quote.status || 'draft').slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-right text-sm font-medium text-gray-900">${quote.total_amount || '4,200'}</td>
                </tr>
              ))}
              {filteredQuotes.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-gray-500">No quotes found</td>
                </tr>
              )}
            </tbody>
          </Table>
        </div>
      </div>
    </DashboardLayout>
  );
}
