import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from './DashboardLayout';
import Card from './Card';
import { useApi } from '../hooks/useApi';
import { Loader, ArrowLeft } from 'lucide-react';

export default function RequestNew() {
  const navigate = useNavigate();
  const { request } = useApi();

  const [customers, setCustomers] = useState([]);
  const [serviceTypes, setServiceTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [f, setF] = useState({
    title: '', description: '', customer_id: '', service_type_id: '',
    origin_city: '', destination_city: '', required_by_date: '',
    requested_by_name: '', requested_by_email: '', requested_by_phone: '',
  });

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  useEffect(() => {
    let off = false;
    Promise.all([request('/customers-api'), request('/master-data-api')])
      .then(([c, m]) => {
        if (off) return;
        setCustomers(c.data || []);
        setServiceTypes(m.data?.service_types || []);
      })
      .catch((e) => { if (!off) setError(e.message); })
      .finally(() => { if (!off) setLoading(false); });
    return () => { off = true; };
  }, [request]);

  async function submit() {
    setError(null);
    if (!f.title.trim()) return setError('Give the enquiry a title');
    if (!f.customer_id) return setError('Pick a customer');

    setSaving(true);
    try {
      const res = await request('/request-create', {
        method: 'POST',
        body: JSON.stringify({ ...f, required_by_date: f.required_by_date || null }),
      });
      if (!res.success) throw new Error(res.error || 'Could not save the enquiry');
      navigate(`/requests/${res.data.id}`);
    } catch (e) {
      setError(e.message);
      setSaving(false);
    }
  }

  const inp = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
  const lbl = 'block text-sm font-medium text-gray-700 mb-1';
  const opt = <span className="text-gray-400">(optional)</span>;

  return (
    <DashboardLayout pageTitle="New Enquiry">
      <div className="max-w-3xl space-y-6">
        <button onClick={() => navigate('/requests')}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
          <ArrowLeft size={16} /> Back to requests
        </button>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
        )}

        <Card className="p-6 space-y-4">
          <h3 className="font-semibold text-gray-900">What's being asked for</h3>
          <div>
            <label className={lbl}>Title</label>
            <input className={inp} value={f.title} onChange={set('title')}
              placeholder="Hamburg to Singapore - 2x 40HC FCL" />
          </div>
          <div>
            <label className={lbl}>Details {opt}</label>
            <textarea className={inp} rows={3} value={f.description} onChange={set('description')}
              placeholder="Commodity, weights, dimensions, hazmat, special handling" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Customer</label>
              <select className={inp} value={f.customer_id} onChange={set('customer_id')} disabled={loading}>
                <option value="">{loading ? 'Loading...' : 'Select a customer...'}</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>Service {opt}</label>
              <select className={inp} value={f.service_type_id} onChange={set('service_type_id')} disabled={loading}>
                <option value="">Not decided yet</option>
                {serviceTypes.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>
        </Card>

        <Card className="p-6 space-y-4">
          <h3 className="font-semibold text-gray-900">Route &amp; timing</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Origin {opt}</label>
              <input className={inp} value={f.origin_city} onChange={set('origin_city')} placeholder="Hamburg" />
            </div>
            <div>
              <label className={lbl}>Destination {opt}</label>
              <input className={inp} value={f.destination_city} onChange={set('destination_city')} placeholder="Singapore" />
            </div>
          </div>
          <div className="w-1/2 pr-2">
            <label className={lbl}>Needed by {opt}</label>
            <input type="date" className={inp} value={f.required_by_date} onChange={set('required_by_date')} />
          </div>
        </Card>

        <Card className="p-6 space-y-4">
          <h3 className="font-semibold text-gray-900">Who asked</h3>
          <p className="text-xs text-gray-500 -mt-2">The contact at the customer, not the company.</p>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={lbl}>Name {opt}</label>
              <input className={inp} value={f.requested_by_name} onChange={set('requested_by_name')} />
            </div>
            <div>
              <label className={lbl}>Email {opt}</label>
              <input type="email" className={inp} value={f.requested_by_email} onChange={set('requested_by_email')} />
            </div>
            <div>
              <label className={lbl}>Phone {opt}</label>
              <input className={inp} value={f.requested_by_phone} onChange={set('requested_by_phone')} />
            </div>
          </div>
        </Card>

        <div className="flex gap-3">
          <button onClick={submit} disabled={saving}
            className="px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
            {saving && <Loader size={16} className="animate-spin" />}
            {saving ? 'Saving...' : 'Log enquiry'}
          </button>
          <button onClick={() => navigate('/requests')} disabled={saving}
            className="px-5 py-2.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Cancel
          </button>
        </div>

        <p className="text-xs text-gray-500">
          Logs the enquiry as pending. Convert it to a quote from the detail page.
        </p>
      </div>
    </DashboardLayout>
  );
}
