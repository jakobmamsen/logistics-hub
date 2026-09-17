import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from './DashboardLayout';
import Card from './Card';
import { useApi } from '../hooks/useApi';
import { Loader, Plus, Trash2, ArrowLeft, Download, Lock } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/.netlify/functions';
const eur = (n) => new Intl.NumberFormat('en-US', {
  style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n || 0);

export default function QuoteEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { request } = useApi();

  const [quote, setQuote] = useState(null);
  const [master, setMaster] = useState({ incoterms: [], catalog: [], service_types: [] });
  const [lines, setLines] = useState([]);
  const [terms, setTerms] = useState({ incoterm_id: '', payment_terms: '', transit_days: '', notes: '' });
  const [draft, setDraft] = useState({ category: '', catalog_id: '', quantity: 1, sell: '', buy: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let off = false;
    Promise.all([request(`/quote-detail?id=${id}`), request('/master-data-api')])
      .then(([d, m]) => {
        if (off) return;
        if (!d.success) throw new Error(d.error || 'Not found');
        setQuote(d.data);
        setMaster(m.data || {});
        const opt = d.data.options?.[0];
        setLines((opt?.lines || []).map((l, i) => ({
          key: `x${i}`,
          catalog_id: null,
          description: l.description,
          quantity: Number(l.quantity),
          sell_unit_price: Number(l.sell_unit_price),
          buy_unit_price: Number(l.buy_unit_price || 0),
        })));
        setTerms({
          incoterm_id: d.data.current_version?.incoterm_id || '',
          payment_terms: d.data.current_version?.payment_terms || '',
          transit_days: opt?.transit_days || '',
          notes: d.data.current_version?.notes || '',
        });
      })
      .catch((e) => { if (!off) setError(e.message); })
      .finally(() => { if (!off) setLoading(false); });
    return () => { off = true; };
  }, [id, request]);

  const categories = useMemo(() => {
    const seen = {};
    for (const c of (master.catalog || [])) seen[c.category] = c.category_name;
    return Object.entries(seen);
  }, [master.catalog]);

  const subTypes = useMemo(
    () => (master.catalog || []).filter((c) => c.category === draft.category),
    [master.catalog, draft.category]);

  const totals = useMemo(() => {
    const sell = lines.reduce((s, l) => s + l.quantity * l.sell_unit_price, 0);
    const buy = lines.reduce((s, l) => s + l.quantity * (l.buy_unit_price || 0), 0);
    const profit = sell - buy;
    return { sell, buy, profit, margin: sell > 0 ? (profit / sell) * 100 : 0 };
  }, [lines]);

  function addLine() {
    if (!draft.catalog_id) return setError('Pick a container or service');
    if (!draft.sell) return setError('Enter a sell price');
    const item = master.catalog.find((c) => c.id === draft.catalog_id);
    setLines([...lines, {
      key: `n${Date.now()}`,
      catalog_id: item.id,
      description: item.name,
      quantity: Number(draft.quantity) || 1,
      sell_unit_price: Number(draft.sell),
      buy_unit_price: Number(draft.buy) || 0,
    }]);
    setDraft({ category: '', catalog_id: '', quantity: 1, sell: '', buy: '' });
    setError(null);
  }

  function patch(key, field, value) {
    setLines(lines.map((l) => l.key === key ? { ...l, [field]: Number(value) || 0 } : l));
  }

  async function save() {
    setError(null); setSaving(true); setSaved(false);
    try {
      const res = await request('/quote-update', {
        method: 'POST',
        body: JSON.stringify({
          quote_id: id,
          incoterm_id: terms.incoterm_id || null,
          payment_terms: terms.payment_terms || null,
          notes: terms.notes || null,
          transit_days: terms.transit_days || null,
          lines: lines.map((l) => ({
            catalog_id: l.catalog_id,
            description: l.description,
            quantity: l.quantity,
            sell_unit_price: l.sell_unit_price,
            buy_unit_price: l.buy_unit_price,
            currency: 'EUR',
          })),
        }),
      });
      if (!res.success) throw new Error(res.error || 'Save failed');
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function pdf() {
    const res = await fetch(`${API_BASE}/quote-pdf?id=${id}`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${quote.reference_number}.pdf`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }

  const inp = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
  const ro = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-600';
  const lbl = 'block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1';

  if (loading) return <DashboardLayout pageTitle="Quote"><div className="py-12 text-center text-gray-500">Loading...</div></DashboardLayout>;
  if (!quote) return <DashboardLayout pageTitle="Quote"><div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error || 'Not found'}</div></DashboardLayout>;

  const editable = quote.editable;

  return (
    <DashboardLayout pageTitle={quote.reference_number}>
      <div className="max-w-5xl space-y-6">
        <div className="flex items-center justify-between">
          <button onClick={() => navigate('/quotes')}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
            <ArrowLeft size={16} /> Back to quotes
          </button>
          <div className="flex gap-2">
            <button onClick={pdf}
              className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2">
              <Download size={16} /> PDF
            </button>
            {editable && (
              <button onClick={save} disabled={saving}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
                {saving && <Loader size={16} className="animate-spin" />}
                {saving ? 'Saving...' : 'Save changes'}
              </button>
            )}
          </div>
        </div>

        {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}
        {saved && <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">Changes saved.</div>}

        {!editable && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 flex items-center gap-2">
            <Lock size={16} />
            This quote is {quote.status} and locked. Revising it means creating a new version.
          </div>
        )}

        <Card className="p-6">
          <div className="grid grid-cols-3 gap-4">
            <div><label className={lbl}>Reference</label>
              <input className={ro} value={quote.reference_number} readOnly /></div>
            <div><label className={lbl}>Customer</label>
              <input className={ro} value={quote.customer_name || ''} readOnly /></div>
            <div><label className={lbl}>Service</label>
              <input className={ro} value={quote.service_type_name || '-'} readOnly /></div>
            <div><label className={lbl}>Origin</label>
              <input className={ro} value={quote.origin_city || '-'} readOnly /></div>
            <div><label className={lbl}>Destination</label>
              <input className={ro} value={quote.destination_city || '-'} readOnly /></div>
            <div><label className={lbl}>Valid until</label>
              <input className={ro} readOnly
                value={quote.expires_at ? new Date(quote.expires_at).toLocaleDateString('en-GB') : '-'} /></div>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-4">
            <div><label className={lbl}>Incoterm</label>
              <select className={editable ? inp : ro} value={terms.incoterm_id} disabled={!editable}
                onChange={(e) => setTerms({ ...terms, incoterm_id: e.target.value })}>
                <option value="">None</option>
                {(master.incoterms || []).map((i) => <option key={i.id} value={i.id}>{i.code}</option>)}
              </select></div>
            <div><label className={lbl}>Payment terms</label>
              <input className={editable ? inp : ro} value={terms.payment_terms} disabled={!editable}
                onChange={(e) => setTerms({ ...terms, payment_terms: e.target.value })} placeholder="Net 30" /></div>
            <div><label className={lbl}>Transit days</label>
              <input type="number" className={editable ? inp : ro} value={terms.transit_days} disabled={!editable}
                onChange={(e) => setTerms({ ...terms, transit_days: e.target.value })} /></div>
          </div>
        </Card>

        {editable && (
          <Card className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Add line item</h3>
            <div className="grid gap-3" style={{ gridTemplateColumns: '1.8fr 1.8fr 0.6fr 1fr 1fr auto' }}>
              <div><label className={lbl}>Container / Service</label>
                <select className={inp} value={draft.category}
                  onChange={(e) => setDraft({ ...draft, category: e.target.value, catalog_id: '' })}>
                  <option value="">Choose...</option>
                  {categories.map(([k, n]) => <option key={k} value={k}>{n}</option>)}
                </select></div>
              <div><label className={lbl}>Sub-type</label>
                <select className={inp} value={draft.catalog_id} disabled={!draft.category}
                  onChange={(e) => setDraft({ ...draft, catalog_id: e.target.value })}>
                  <option value="">Select...</option>
                  {subTypes.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select></div>
              <div><label className={lbl}>Qty</label>
                <input type="number" min="1" className={`${inp} text-center`} value={draft.quantity}
                  onChange={(e) => setDraft({ ...draft, quantity: e.target.value })} /></div>
              <div><label className={lbl}>Sell &euro;</label>
                <input type="number" step="0.01" className={inp} value={draft.sell}
                  onChange={(e) => setDraft({ ...draft, sell: e.target.value })} /></div>
              <div><label className={lbl}>Buy &euro;</label>
                <input type="number" step="0.01" className={inp} value={draft.buy}
                  onChange={(e) => setDraft({ ...draft, buy: e.target.value })} /></div>
              <div className="flex items-end">
                <button onClick={addLine}
                  className="h-[38px] px-4 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 flex items-center gap-1">
                  <Plus size={16} /> Add
                </button></div>
            </div>
          </Card>
        )}

        <Card className="overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200"><tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Description</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase w-20">Qty</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase w-32">Sell &euro;</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase w-32">Buy &euro;</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Total</th>
              {editable && <th className="px-4 py-3 w-12"></th>}
            </tr></thead>
            <tbody>
              {lines.map((l) => (
                <tr key={l.key} className="border-b border-gray-100">
                  <td className="px-4 py-2 text-sm text-gray-900">{l.description}</td>
                  <td className="px-4 py-2">
                    {editable
                      ? <input type="number" min="1" value={l.quantity}
                          onChange={(e) => patch(l.key, 'quantity', e.target.value)}
                          className="w-16 px-2 py-1 border border-gray-300 rounded text-sm text-center" />
                      : <span className="text-sm block text-center">{l.quantity}</span>}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {editable
                      ? <input type="number" step="0.01" value={l.sell_unit_price}
                          onChange={(e) => patch(l.key, 'sell_unit_price', e.target.value)}
                          className="w-28 px-2 py-1 border border-gray-300 rounded text-sm text-right" />
                      : <span className="text-sm">{eur(l.sell_unit_price)}</span>}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {editable
                      ? <input type="number" step="0.01" value={l.buy_unit_price}
                          onChange={(e) => patch(l.key, 'buy_unit_price', e.target.value)}
                          className="w-28 px-2 py-1 border border-gray-300 rounded text-sm text-right" />
                      : <span className="text-sm text-gray-500">{eur(l.buy_unit_price)}</span>}
                  </td>
                  <td className="px-4 py-2 text-right text-sm font-medium">
                    {eur(l.quantity * l.sell_unit_price)}
                  </td>
                  {editable && (
                    <td className="px-4 py-2 text-right">
                      <button onClick={() => setLines(lines.filter((x) => x.key !== l.key))}
                        className="text-gray-400 hover:text-red-600"><Trash2 size={16} /></button>
                    </td>
                  )}
                </tr>
              ))}
              {lines.length === 0 && (
                <tr><td colSpan={editable ? 6 : 5} className="px-4 py-8 text-center text-sm text-gray-500">
                  No line items</td></tr>
              )}
            </tbody>
          </table>
        </Card>

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
              {totals.margin >= 15 && totals.sell <= 10000 ? 'Auto-approve'
                : totals.margin < 15 ? 'Below 15%' : 'Over EUR 10k'}</p></Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
