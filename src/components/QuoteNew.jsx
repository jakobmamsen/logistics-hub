import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from './DashboardLayout';
import Card from './Card';
import { useApi } from '../hooks/useApi';
import { Loader, Plus, ArrowLeft, ArrowRight, Check, Trash2 } from 'lucide-react';

const TYPES = ['shipper', 'consignee', 'freight_forwarder', 'broker', 'agent', 'partner'];
const eur = (n) => new Intl.NumberFormat('en-US', {
  style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n || 0);

export default function QuoteNew() {
  const navigate = useNavigate();
  const { request } = useApi();

  const [step, setStep] = useState(1);
  const [customers, setCustomers] = useState([]);
  const [master, setMaster] = useState({ service_types: [], incoterms: [], catalog: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [f, setF] = useState({
    title: '', description: '', customer_id: '', service_type_id: '',
    origin_city: '', destination_city: '', required_by_date: '',
    valid_days: 30, incoterm_id: '', payment_terms: '', transit_days: '',
    option_title: 'Standard', notes: '',
  });
  const [addingNew, setAddingNew] = useState(false);
  const [nc, setNc] = useState({ name: '', email: '', customer_type: 'shipper', city: '' });
  const [lines, setLines] = useState([]);
  const [draft, setDraft] = useState({ category: '', catalog_id: '', quantity: 1, sell: '', buy: '' });

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  useEffect(() => {
    let off = false;
    Promise.all([request('/customers-api'), request('/master-data-api')])
      .then(([c, m]) => {
        if (off) return;
        setCustomers(c.data || []);
        setMaster(m.data || { service_types: [], incoterms: [], catalog: [] });
      })
      .catch((e) => { if (!off) setError(e.message); })
      .finally(() => { if (!off) setLoading(false); });
    return () => { off = true; };
  }, [request]);

  const categories = useMemo(() => {
    const seen = {};
    for (const c of master.catalog) seen[c.category] = c.category_name;
    return Object.entries(seen);
  }, [master.catalog]);

  const subTypes = useMemo(
    () => master.catalog.filter((c) => c.category === draft.category),
    [master.catalog, draft.category]);

  const totals = useMemo(() => {
    const sell = lines.reduce((s, l) => s + l.quantity * l.sell_unit_price, 0);
    const buy = lines.reduce((s, l) => s + l.quantity * (l.buy_unit_price || 0), 0);
    const profit = sell - buy;
    return { sell, buy, profit, margin: sell > 0 ? (profit / sell) * 100 : 0 };
  }, [lines]);

  const autoApprove = totals.margin >= 15 && totals.sell <= 10000;

  function addLine() {
    if (!draft.catalog_id) return setError('Pick a container or service');
    if (!draft.sell) return setError('Enter a sell price');
    const item = master.catalog.find((c) => c.id === draft.catalog_id);
    setLines([...lines, {
      key: Date.now(),
      catalog_id: item.id,
      description: item.name,
      subcategory_id: item.subcategory_id,
      quantity: Number(draft.quantity) || 1,
      sell_unit_price: Number(draft.sell),
      buy_unit_price: Number(draft.buy) || 0,
    }]);
    setDraft({ category: '', catalog_id: '', quantity: 1, sell: '', buy: '' });
    setError(null);
  }

  async function submit() {
    setError(null);
    setSaving(true);
    try {
      const res = await request('/quote-create', {
        method: 'POST',
        body: JSON.stringify({
          ...f,
          required_by_date: f.required_by_date || null,
          transit_days: f.transit_days || null,
          ...(addingNew ? { new_customer: nc } : { customer_id: f.customer_id }),
          lines: lines.map((l) => ({
            catalog_id: l.catalog_id, description: l.description,
            quantity: l.quantity, sell_unit_price: l.sell_unit_price,
            buy_unit_price: l.buy_unit_price, currency: 'EUR',
          })),
        }),
      });
      if (!res.success) throw new Error(res.error || 'Could not create the quote');
      navigate('/quotes');
    } catch (e) {
      setError(e.message);
      setSaving(false);
    }
  }

  function next() {
    setError(null);
    if (step === 1) {
      if (!f.title.trim()) return setError('Give the quote a title');
      if (!addingNew && !f.customer_id) return setError('Pick a customer');
      if (addingNew && (!nc.name.trim() || !nc.email.trim())) {
        return setError('New customer needs a name and email');
      }
    }
    setStep(step + 1);
  }

  const inp = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
  const lbl = 'block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1';
  const opt = <span className="text-gray-400 normal-case font-normal">(optional)</span>;

  return (
    <DashboardLayout pageTitle="New Quote">
      <div className="max-w-5xl space-y-6">
        <button onClick={() => navigate('/quotes')}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
          <ArrowLeft size={16} /> Back to quotes
        </button>

        <div className="flex items-center gap-2">
          {[1, 2, 3, 4].map((n) => (
            <React.Fragment key={n}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
                step > n ? 'bg-green-600 text-white'
                : step === n ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                {step > n ? <Check size={14} /> : n}
              </div>
              {n < 4 && <div className={`flex-1 h-0.5 ${step > n ? 'bg-green-600' : 'bg-gray-200'}`} />}
            </React.Fragment>
          ))}
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
        )}

        {step === 1 && (
          <Card className="p-6 space-y-4">
            <h3 className="font-semibold text-gray-900">Enquiry &amp; customer</h3>
            <div>
              <label className={lbl}>Title</label>
              <input className={inp} value={f.title} onChange={set('title')}
                placeholder="Hamburg to Singapore - 2x 40HC FCL" />
            </div>
            <div>
              <label className={lbl}>Details {opt}</label>
              <textarea className={inp} rows={2} value={f.description} onChange={set('description')}
                placeholder="Commodity, weights, hazmat, special handling" />
            </div>

            <div className="flex items-center justify-between pt-2">
              <label className={lbl}>Customer</label>
              <button onClick={() => { setAddingNew(!addingNew); setF({ ...f, customer_id: '' }); }}
                className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                {addingNew ? 'Pick existing' : <><Plus size={14} /> New customer</>}
              </button>
            </div>

            {!addingNew ? (
              <select className={inp} value={f.customer_id} onChange={set('customer_id')} disabled={loading}>
                <option value="">{loading ? 'Loading...' : 'Select a customer...'}</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div><label className={lbl}>Company</label>
                  <input className={inp} value={nc.name} onChange={(e) => setNc({ ...nc, name: e.target.value })} /></div>
                <div><label className={lbl}>Email</label>
                  <input type="email" className={inp} value={nc.email} onChange={(e) => setNc({ ...nc, email: e.target.value })} /></div>
                <div><label className={lbl}>Type</label>
                  <select className={inp} value={nc.customer_type} onChange={(e) => setNc({ ...nc, customer_type: e.target.value })}>
                    {TYPES.map((t) => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                  </select></div>
                <div><label className={lbl}>City {opt}</label>
                  <input className={inp} value={nc.city} onChange={(e) => setNc({ ...nc, city: e.target.value })} /></div>
              </div>
            )}
          </Card>
        )}

        {step === 2 && (
          <Card className="p-6 space-y-4">
            <h3 className="font-semibold text-gray-900">Route, service &amp; terms</h3>
            <div className="grid grid-cols-3 gap-4">
              <div><label className={lbl}>Origin {opt}</label>
                <input className={inp} value={f.origin_city} onChange={set('origin_city')} placeholder="Hamburg" /></div>
              <div><label className={lbl}>Destination {opt}</label>
                <input className={inp} value={f.destination_city} onChange={set('destination_city')} placeholder="Singapore" /></div>
              <div><label className={lbl}>Service {opt}</label>
                <select className={inp} value={f.service_type_id} onChange={set('service_type_id')}>
                  <option value="">Not decided</option>
                  {master.service_types.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select></div>
            </div>
            <div className="grid grid-cols-4 gap-4">
              <div><label className={lbl}>Valid (days)</label>
                <input type="number" className={inp} value={f.valid_days} onChange={set('valid_days')} min="1" /></div>
              <div><label className={lbl}>Incoterm {opt}</label>
                <select className={inp} value={f.incoterm_id} onChange={set('incoterm_id')}>
                  <option value="">None</option>
                  {master.incoterms.map((i) => <option key={i.id} value={i.id}>{i.code}</option>)}
                </select></div>
              <div><label className={lbl}>Transit days {opt}</label>
                <input type="number" className={inp} value={f.transit_days} onChange={set('transit_days')} placeholder="21" /></div>
              <div><label className={lbl}>Needed by {opt}</label>
                <input type="date" className={inp} value={f.required_by_date} onChange={set('required_by_date')} /></div>
            </div>
            <div><label className={lbl}>Payment terms {opt}</label>
              <input className={inp} value={f.payment_terms} onChange={set('payment_terms')} placeholder="Net 30" /></div>
          </Card>
        )}

        {step === 3 && (
          <>
            <Card className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Add line item</h3>
              <div className="grid gap-3" style={{ gridTemplateColumns: '1.8fr 1.8fr 0.6fr 1fr 1fr auto' }}>
                <div><label className={lbl}>Container / Service</label>
                  <select className={inp} value={draft.category}
                    onChange={(e) => setDraft({ ...draft, category: e.target.value, catalog_id: '' })}>
                    <option value="">Choose type...</option>
                    {categories.map(([k, name]) => <option key={k} value={k}>{name}</option>)}
                  </select></div>
                <div><label className={lbl}>Sub-type</label>
                  <select className={inp} value={draft.catalog_id}
                    onChange={(e) => setDraft({ ...draft, catalog_id: e.target.value })}
                    disabled={!draft.category}>
                    <option value="">Select...</option>
                    {subTypes.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select></div>
                <div><label className={lbl}>Qty</label>
                  <input type="number" min="1" className={`${inp} text-center`} value={draft.quantity}
                    onChange={(e) => setDraft({ ...draft, quantity: e.target.value })} /></div>
                <div><label className={lbl}>Sell &euro;</label>
                  <input type="number" step="0.01" className={inp} value={draft.sell}
                    onChange={(e) => setDraft({ ...draft, sell: e.target.value })} placeholder="0.00" /></div>
                <div><label className={lbl}>Buy &euro;</label>
                  <input type="number" step="0.01" className={inp} value={draft.buy}
                    onChange={(e) => setDraft({ ...draft, buy: e.target.value })} placeholder="0.00" /></div>
                <div className="flex items-end">
                  <button onClick={addLine}
                    className="h-[38px] px-4 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 flex items-center gap-1">
                    <Plus size={16} /> Add
                  </button></div>
              </div>
              <p className="text-xs text-gray-500 mt-2">Prices are spot rates - type the current rate.</p>
            </Card>

            <Card className="overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Description</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Qty</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Sell</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Buy</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Line total</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l) => (
                    <tr key={l.key} className="border-b border-gray-100">
                      <td className="px-4 py-3 text-sm text-gray-900">{l.description}</td>
                      <td className="px-4 py-3 text-sm text-center">{l.quantity}</td>
                      <td className="px-4 py-3 text-sm text-right">{eur(l.sell_unit_price)}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-500">{eur(l.buy_unit_price)}</td>
                      <td className="px-4 py-3 text-sm text-right font-medium">{eur(l.quantity * l.sell_unit_price)}</td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => setLines(lines.filter((x) => x.key !== l.key))}
                          className="text-gray-400 hover:text-red-600"><Trash2 size={16} /></button>
                      </td>
                    </tr>
                  ))}
                  {lines.length === 0 && (
                    <tr><td colSpan="6" className="px-4 py-8 text-center text-sm text-gray-500">
                      No line items yet</td></tr>
                  )}
                </tbody>
              </table>
            </Card>

            {lines.length > 0 && (
              <div className="grid grid-cols-4 gap-4">
                <Card className="p-4"><p className="text-xs text-gray-600 uppercase">Total sell</p>
                  <p className="text-2xl font-bold text-gray-900">{eur(totals.sell)}</p></Card>
                <Card className="p-4"><p className="text-xs text-gray-600 uppercase">Total buy</p>
                  <p className="text-2xl font-bold text-amber-600">{eur(totals.buy)}</p></Card>
                <Card className="p-4"><p className="text-xs text-gray-600 uppercase">Gross profit</p>
                  <p className="text-2xl font-bold text-green-600">{eur(totals.profit)}</p></Card>
                <Card className="p-4"><p className="text-xs text-gray-600 uppercase">Margin</p>
                  <p className={`text-2xl font-bold ${totals.margin >= 15 ? 'text-green-600' : 'text-red-600'}`}>
                    {totals.margin.toFixed(1)}%</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {autoApprove ? 'Auto-approve' : totals.margin < 15 ? 'Below 15%' : 'Over EUR 10k'}
                  </p></Card>
              </div>
            )}
          </>
        )}

        {step === 4 && (
          <Card className="p-6 space-y-3">
            <h3 className="font-semibold text-gray-900">Review</h3>
            <div className="text-sm text-gray-700 space-y-1">
              <p>Customer: <strong>{addingNew ? nc.name : customers.find((c) => c.id === f.customer_id)?.name}</strong></p>
              <p>Title: <strong>{f.title}</strong></p>
              {f.origin_city && <p>Route: <strong>{f.origin_city} &rarr; {f.destination_city}</strong></p>}
              <p>Valid: <strong>{f.valid_days} days</strong></p>
              <p>Line items: <strong>{lines.length}</strong></p>
              {lines.length > 0 && (
                <p>Value: <strong>{eur(totals.sell)}</strong> at <strong>{totals.margin.toFixed(1)}%</strong> margin
                  {' '}{autoApprove ? '(auto-approves)' : '(needs manager approval)'}</p>
              )}
            </div>
            <p className="text-xs text-gray-500 pt-2">
              Creates a draft quote. Totals are recalculated server-side on save.
            </p>
          </Card>
        )}

        <div className="flex gap-3">
          {step > 1 && (
            <button onClick={() => setStep(step - 1)} disabled={saving}
              className="px-5 py-2.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50">
              Back
            </button>
          )}
          {step < 4 && (
            <button onClick={next}
              className="px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 flex items-center gap-2">
              Next <ArrowRight size={16} />
            </button>
          )}
          {step === 4 && (
            <button onClick={submit} disabled={saving}
              className="px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
              {saving && <Loader size={16} className="animate-spin" />}
              {saving ? 'Creating...' : 'Create quote'}
            </button>
          )}
          <button onClick={() => navigate('/quotes')} disabled={saving}
            className="px-5 py-2.5 rounded-lg text-sm text-gray-600 hover:text-gray-900 ml-auto">
            Cancel
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}
