import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from './DashboardLayout';
import Card from './Card';
import { useApi } from '../hooks/useApi';
import { ArrowLeft, Loader, FileText, ArrowRight, Check } from 'lucide-react';

const DASH = '\u2014';

export default function RequestDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { request } = useApi();

  const [req, setReq] = useState(null);
  const [incoterms, setIncoterms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [wizard, setWizard] = useState(false);
  const [step, setStep] = useState(1);
  const [converting, setConverting] = useState(false);
  const [terms, setTerms] = useState({
    valid_days: 30, incoterm_id: '', payment_terms: '',
    transport_mode: '', transit_days: '', option_title: 'Standard', notes: '',
  });

  const set = (k) => (e) => setTerms({ ...terms, [k]: e.target.value });

  useEffect(() => {
    let off = false;
    Promise.all([request(`/requests-api?id=${id}`), request('/master-data-api')])
      .then(([r, m]) => {
        if (off) return;
        setReq(r.data);
        setIncoterms(m.data?.incoterms || []);
        setTerms((t) => ({ ...t, transport_mode: r.data?.service_type_name || '' }));
      })
      .catch((e) => { if (!off) setError(e.message); })
      .finally(() => { if (!off) setLoading(false); });
    return () => { off = true; };
  }, [id, request]);

  async function convert() {
    setError(null);
    setConverting(true);
    try {
      const res = await request('/request-convert', {
        method: 'POST',
        body: JSON.stringify({
          request_id: id,
          valid_days: Number(terms.valid_days) || 30,
          incoterm_id: terms.incoterm_id || null,
          payment_terms: terms.payment_terms || null,
          transport_mode: terms.transport_mode || null,
          transit_days: terms.transit_days ? Number(terms.transit_days) : null,
          option_title: terms.option_title || 'Standard',
          notes: terms.notes || null,
        }),
      });
      if (!res.success) throw new Error(res.error || 'Conversion failed');
      navigate(`/quotes/${res.data.quote_id}/builder`);
    } catch (e) {
      setError(e.message);
      setConverting(false);
    }
  }

  const inp = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
  const lbl = 'block text-sm font-medium text-gray-700 mb-1';

  if (loading) {
    return <DashboardLayout pageTitle="Enquiry">
      <div className="py-12 text-center text-gray-500">Loading...</div>
    </DashboardLayout>;
  }

  if (!req) {
    return <DashboardLayout pageTitle="Enquiry">
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
        {error || 'Enquiry not found'}
      </div>
    </DashboardLayout>;
  }

  const Row = ({ k, v }) => (
    <div className="py-2 border-b border-gray-100 last:border-0">
      <dt className="text-xs text-gray-500">{k}</dt>
      <dd className="text-sm text-gray-900">{v || DASH}</dd>
    </div>
  );

  return (
    <DashboardLayout pageTitle={req.title}>
      <div className="max-w-4xl space-y-6">
        <button onClick={() => navigate('/requests')}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
          <ArrowLeft size={16} /> Back to requests
        </button>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6">
            <h3 className="font-semibold text-gray-900 mb-3">Enquiry</h3>
            <dl>
              <Row k="Customer" v={req.customer?.name} />
              <Row k="Service" v={req.service_type_name} />
              <Row k="Route" v={req.origin_city && req.destination_city
                ? `${req.origin_city} \u2192 ${req.destination_city}` : null} />
              <Row k="Needed by" v={req.required_by_date
                ? new Date(req.required_by_date).toLocaleDateString('en-GB') : null} />
              <Row k="Status" v={req.status} />
            </dl>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold text-gray-900 mb-3">Contact</h3>
            <dl>
              <Row k="Name" v={req.requested_by_name} />
              <Row k="Email" v={req.requested_by_email} />
              <Row k="Phone" v={req.requested_by_phone} />
              <Row k="Received" v={req.requested_at
                ? new Date(req.requested_at).toLocaleString('en-GB') : null} />
            </dl>
          </Card>
        </div>

        {req.description && (
          <Card className="p-6">
            <h3 className="font-semibold text-gray-900 mb-2">Details</h3>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{req.description}</p>
          </Card>
        )}

        <Card className="p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">Quotes from this enquiry</h3>
            {!wizard && (
              <button onClick={() => setWizard(true)}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 flex items-center gap-2">
                <FileText size={16} /> Convert to quote
              </button>
            )}
          </div>

          {(req.quotes || []).length === 0 && (
            <p className="text-sm text-gray-500">No quotes yet.</p>
          )}
          {(req.quotes || []).map((q) => (
            <div key={q.id} onClick={() => navigate(`/quotes/${q.id}/builder`)}
              className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0 cursor-pointer hover:bg-gray-50">
              <div>
                <p className="text-sm font-medium text-blue-600">{q.reference_number}</p>
                <p className="text-xs text-gray-500">
                  created {new Date(q.created_at).toLocaleDateString('en-GB')}
                </p>
              </div>
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                {q.status}
              </span>
            </div>
          ))}
        </Card>

        {wizard && (
          <Card className="p-6 space-y-5 border-blue-200">
            <div className="flex items-center gap-2">
              {[1, 2, 3].map((n) => (
                <React.Fragment key={n}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${
                    step > n ? 'bg-green-600 text-white'
                    : step === n ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                    {step > n ? <Check size={14} /> : n}
                  </div>
                  {n < 3 && <div className={`flex-1 h-0.5 ${step > n ? 'bg-green-600' : 'bg-gray-200'}`} />}
                </React.Fragment>
              ))}
            </div>

            {step === 1 && (
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">1. Confirm the enquiry</h4>
                <p className="text-sm text-gray-600">
                  Quoting <strong>{req.customer?.name}</strong>
                  {req.origin_city && req.destination_city &&
                    <> for {req.origin_city} &rarr; {req.destination_city}</>}
                  {req.service_type_name && <> by {req.service_type_name}</>}.
                </p>
                <p className="text-xs text-gray-500">
                  Wrong details? Edit the enquiry before converting.
                </p>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">2. Terms</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={lbl}>Valid for (days)</label>
                    <input type="number" className={inp} value={terms.valid_days} onChange={set('valid_days')} min="1" />
                  </div>
                  <div>
                    <label className={lbl}>Incoterm</label>
                    <select className={inp} value={terms.incoterm_id} onChange={set('incoterm_id')}>
                      <option value="">Not specified</option>
                      {incoterms.map((i) => (
                        <option key={i.id} value={i.id}>{i.code} - {i.description?.split('(')[0].trim()}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={lbl}>Payment terms</label>
                    <input className={inp} value={terms.payment_terms} onChange={set('payment_terms')} placeholder="Net 30" />
                  </div>
                  <div>
                    <label className={lbl}>Transit days</label>
                    <input type="number" className={inp} value={terms.transit_days} onChange={set('transit_days')} placeholder="21" />
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">3. Create the draft</h4>
                <div className="text-sm text-gray-700 space-y-1">
                  <p>Customer: <strong>{req.customer?.name}</strong></p>
                  <p>Valid: <strong>{terms.valid_days} days</strong></p>
                  <p>Incoterm: <strong>
                    {incoterms.find((i) => i.id === terms.incoterm_id)?.code || 'not specified'}
                  </strong></p>
                  <p>Option: <strong>{terms.option_title}</strong></p>
                </div>
                <p className="text-xs text-gray-500">
                  Creates a draft quote with version 1. You'll add line items and pricing next.
                </p>
              </div>
            )}

            <div className="flex gap-3 pt-2 border-t border-gray-100">
              {step > 1 && (
                <button onClick={() => setStep(step - 1)} disabled={converting}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50">
                  Back
                </button>
              )}
              {step < 3 && (
                <button onClick={() => setStep(step + 1)}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 flex items-center gap-2">
                  Next <ArrowRight size={16} />
                </button>
              )}
              {step === 3 && (
                <button onClick={convert} disabled={converting}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
                  {converting && <Loader size={16} className="animate-spin" />}
                  {converting ? 'Creating...' : 'Create draft quote'}
                </button>
              )}
              <button onClick={() => { setWizard(false); setStep(1); }} disabled={converting}
                className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:text-gray-900 ml-auto">
                Cancel
              </button>
            </div>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
