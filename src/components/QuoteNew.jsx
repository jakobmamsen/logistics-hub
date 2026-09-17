import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from './DashboardLayout';
import Card from './Card';
import { useApi } from '../hooks/useApi';
import { Loader, Plus, ArrowLeft } from 'lucide-react';

const TYPES = ['shipper', 'consignee', 'freight_forwarder', 'broker', 'agent', 'partner'];

export default function QuoteNew() {
  const navigate = useNavigate();
  const { request } = useApi();

  const [customers, setCustomers] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [addingNew, setAddingNew] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: '', email: '', customer_type: 'shipper', city: '',
  });

  useEffect(() => {
    let off = false;
    request('/customers-api')
      .then((p) => { if (!off) setCustomers(p.data || []); })
      .catch((e) => { if (!off) setError(e.message); })
      .finally(() => { if (!off) setLoadingCustomers(false); });
    return () => { off = true; };
  }, [request]);

  const label = (s) =>
    (s || '').split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  async function handleSubmit() {
    setError(null);

    if (!title.trim()) return setError('Give the quote a title');
    if (!addingNew && !customerId) return setError('Pick a customer');
    if (addingNew && (!newCustomer.name.trim() || !newCustomer.email.trim())) {
      return setError('New customer needs a name and an email');
    }

    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        ...(addingNew
          ? { new_customer: newCustomer }
          : { customer_id: customerId }),
      };

      const res = await request('/quote-create', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (!res.success) throw new Error(res.error || 'Could not create the quote');
      navigate(`/quotes/${res.data.quote_id}`);
    } catch (e) {
      setError(e.message);
      setSaving(false);
    }
  }

  const field = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
  const lbl = 'block text-sm font-medium text-gray-700 mb-1';

  return (
    <DashboardLayout pageTitle="New Quote">
      <div className="max-w-2xl space-y-6">
        <button onClick={() => navigate('/quotes')}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
          <ArrowLeft size={16} /> Back to quotes
        </button>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}

        <Card className="p-6 space-y-4">
          <div>
            <label className={lbl}>Title</label>
            <input className={field} value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="Hamburg to Singapore - 2x 40HC FCL" />
            <p className="text-xs text-gray-500 mt-1">Route and cargo, as you'd describe it to the customer.</p>
          </div>

          <div>
            <label className={lbl}>Description <span className="text-gray-400">(optional)</span></label>
            <textarea className={field} rows={3} value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Commodity, weights, special requirements, deadlines" />
          </div>
        </Card>

        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Customer</h3>
            <button onClick={() => { setAddingNew(!addingNew); setCustomerId(''); }}
              className="text-sm text-blue-600 hover:underline flex items-center gap-1">
              {addingNew ? 'Pick an existing customer' : <><Plus size={14} /> New customer</>}
            </button>
          </div>

          {!addingNew && (
            loadingCustomers
              ? <p className="text-sm text-gray-500">Loading customers...</p>
              : (
                <select className={field} value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}>
                  <option value="">Select a customer...</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({label(c.customer_type)})
                    </option>
                  ))}
                </select>
              )
          )}

          {addingNew && (
            <div className="space-y-4">
              <div>
                <label className={lbl}>Company name</label>
                <input className={field} value={newCustomer.name}
                  onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })} />
              </div>
              <div>
                <label className={lbl}>Email</label>
                <input className={field} type="email" value={newCustomer.email}
                  onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })} />
                <p className="text-xs text-gray-500 mt-1">Must be unique - used to avoid duplicate records.</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={lbl}>Type</label>
                  <select className={field} value={newCustomer.customer_type}
                    onChange={(e) => setNewCustomer({ ...newCustomer, customer_type: e.target.value })}>
                    {TYPES.map((t) => <option key={t} value={t}>{label(t)}</option>)}
                  </select>
                </div>
                <div>
                  <label className={lbl}>City <span className="text-gray-400">(optional)</span></label>
                  <input className={field} value={newCustomer.city}
                    onChange={(e) => setNewCustomer({ ...newCustomer, city: e.target.value })} />
                </div>
              </div>
            </div>
          )}
        </Card>

        <div className="flex gap-3">
          <button onClick={handleSubmit} disabled={saving}
            className="px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
            {saving && <Loader size={16} className="animate-spin" />}
            {saving ? 'Creating...' : 'Create draft quote'}
          </button>
          <button onClick={() => navigate('/quotes')} disabled={saving}
            className="px-5 py-2.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Cancel
          </button>
        </div>

        <p className="text-xs text-gray-500">
          Creates the quote as a draft with version 1 and a "Standard" option.
          Add line items on the next screen.
        </p>
      </div>
    </DashboardLayout>
  );
}
