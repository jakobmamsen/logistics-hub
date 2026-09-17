// POST - one submit creates the whole chain:
//   [customer?] -> request -> quote -> quote_version -> quote_option -> quote_line[]
// Totals and margin are computed HERE, never trusted from the client.
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_KEY
);

const json = (s, p) => ({
  statusCode: s,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  },
  body: JSON.stringify(p),
});

async function getCaller(event) {
  const auth = event.headers?.authorization || event.headers?.Authorization;
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return null;
  const { data, error } = await supabase.auth.getUser(token);
  return error ? null : data.user;
}

async function nextReference() {
  const now = new Date();
  const prefix = `GLA-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const { data } = await supabase.from('quote').select('reference_number')
    .like('reference_number', `${prefix}-%`)
    .order('reference_number', { ascending: false }).limit(1);
  const last = data?.[0]?.reference_number;
  const n = last ? parseInt(last.slice(prefix.length + 1), 10) + 1 : 1;
  return `${prefix}-${String(n).padStart(3, '0')}`;
}

// catalog subcategory -> charge_category
function chargeFor(sub) {
  if (sub === 'customs') return 'customs';
  if (sub === 'insurance') return 'insurance';
  if (sub === 'port_origin' || sub === 'port_destination') return 'handling';
  return 'freight';
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(200, {});
  if (event.httpMethod !== 'POST') return json(405, { success: false, error: 'POST only' });

  const made = { customer: null, request: null, quote: null, version: null };

  try {
    const caller = await getCaller(event);
    if (!caller) return json(401, { success: false, error: 'Sign in required' });

    const { data: userRow } = await supabase
      .from('users').select('id').eq('id', caller.id).single();
    if (!userRow) return json(403, { success: false, error: 'Account not set up in this workspace' });

    const { data: tm } = await supabase.from('team_member')
      .select('team_id').eq('user_id', caller.id)
      .order('is_primary', { ascending: false }).limit(1);
    const teamId = tm?.[0]?.team_id;
    if (!teamId) return json(403, { success: false, error: 'You are not on a team' });

    const b = JSON.parse(event.body || '{}');
    if (!b.title?.trim()) return json(400, { success: false, error: 'Title is required' });
    if (!b.customer_id && !b.new_customer) {
      return json(400, { success: false, error: 'Pick a customer or add a new one' });
    }
    const lines = Array.isArray(b.lines) ? b.lines : [];

    // lookups for mapping catalog -> real FKs
    const [{ data: cats }, { data: units }, { data: catalog }] = await Promise.all([
      supabase.from('charge_category').select('id, category'),
      supabase.from('unit').select('id, code'),
      supabase.from('line_item_catalog').select('id, name, subcategory_id, unit'),
    ]);
    const catId = (c) => cats.find((x) => x.category === c)?.id;
    const unitId = (c) => units.find((x) => x.code === c)?.id;

    // 1. customer
    let customerId = b.customer_id;
    if (!customerId) {
      const nc = b.new_customer;
      if (!nc.name?.trim() || !nc.email?.trim()) {
        return json(400, { success: false, error: 'New customer needs a name and email' });
      }
      const { data: c, error: cErr } = await supabase.from('customer').insert([{
        name: nc.name.trim(),
        email: nc.email.trim().toLowerCase(),
        customer_type: nc.customer_type || 'shipper',
        city: nc.city || null,
        team_id: teamId,
        is_active: true,
      }]).select('id').single();
      if (cErr) {
        return json(cErr.code === '23505' ? 409 : 500, {
          success: false,
          error: cErr.code === '23505' ? 'A customer with that email already exists' : cErr.message,
          stage: 'customer',
        });
      }
      made.customer = c.id;
      customerId = c.id;
    }

    // 2. request (invisible to the user, required by the schema)
    const { data: req, error: rErr } = await supabase.from('request').insert([{
      customer_id: customerId,
      title: b.title.trim(),
      description: b.description || null,
      status: 'quoted',
      service_type_id: b.service_type_id || null,
      origin_city: b.origin_city || null,
      destination_city: b.destination_city || null,
      required_by_date: b.required_by_date || null,
      requested_at: new Date().toISOString(),
      team_id: teamId,
      created_by: caller.id,
    }]).select('id').single();
    if (rErr) throw Object.assign(new Error(rErr.message), { stage: 'request' });
    made.request = req.id;

    // 3. quote
    const validDays = Number(b.valid_days) > 0 ? Number(b.valid_days) : 30;
    const reference = await nextReference();
    const { data: q, error: qErr } = await supabase.from('quote').insert([{
      request_id: req.id,
      customer_id: customerId,
      reference_number: reference,
      status: 'draft',
      team_id: teamId,
      created_by: caller.id,
      expires_at: new Date(Date.now() + validDays * 86400000).toISOString(),
    }]).select('id, reference_number').single();
    if (qErr) throw Object.assign(new Error(qErr.message), { stage: 'quote' });
    made.quote = q.id;

    // 4. totals, server-side. margin = profit / sell (NOT / buy)
    const sellTotal = lines.reduce((s, l) => s + Number(l.quantity) * Number(l.sell_unit_price), 0);
    const buyTotal  = lines.reduce((s, l) => s + Number(l.quantity) * Number(l.buy_unit_price || 0), 0);
    const profit = sellTotal - buyTotal;
    const margin = sellTotal > 0 ? (profit / sellTotal) * 100 : null;
    // locked rule: margin >= 15% AND value <= 10000 auto-approves
    const needsApproval = lines.length > 0 && (margin < 15 || sellTotal > 10000);

    const priced = lines.length > 0;
    const { data: v, error: vErr } = await supabase.from('quote_version').insert([{
      quote_id: q.id,
      version_number: 1,
      status: 'draft',
      requires_approval: priced ? needsApproval : false,
      approval_reason: priced && needsApproval
        ? (margin < 15 ? 'Margin below 15%' : 'Value above EUR 10,000') : null,
      incoterm_id: b.incoterm_id || null,
      payment_terms: b.payment_terms || null,
      notes: b.notes || null,
      // all three together or all null - pricing_consistent constraint
      buy_total: priced ? buyTotal.toFixed(2) : null,
      sell_total: priced ? sellTotal.toFixed(2) : null,
      margin_percent: priced ? margin.toFixed(2) : null,
      gross_profit: priced ? profit.toFixed(2) : null,
    }]).select('id').single();
    if (vErr) throw Object.assign(new Error(vErr.message), { stage: 'quote_version' });
    made.version = v.id;

    // 5. option
    const { data: o, error: oErr } = await supabase.from('quote_option').insert([{
      quote_version_id: v.id,
      title: b.option_title || 'Standard',
      transport_mode: b.transport_mode || null,
      transit_days: b.transit_days ? Number(b.transit_days) : null,
      is_recommended: true,
    }]).select('id').single();
    if (oErr) throw Object.assign(new Error(oErr.message), { stage: 'quote_option' });

    // 6. lines
    if (priced) {
      const rows = lines.map((l) => {
        const item = catalog.find((c) => c.id === l.catalog_id);
        const sub = item?.subcategory_id || '';
        return {
          quote_option_id: o.id,
          charge_category_id: catId(chargeFor(sub)),
          description: l.description || item?.name || 'Line item',
          quantity: Number(l.quantity),
          unit_id: unitId(item?.unit === 'Shipment' ? 'shipment' : 'container'),
          sell_unit_price: Number(l.sell_unit_price),
          sell_currency: l.currency || 'EUR',
          buy_unit_price: l.buy_unit_price ? Number(l.buy_unit_price) : null,
          buy_currency: l.buy_unit_price ? (l.currency || 'EUR') : null,
          fx_rate: 1.0,
          sell_line_total: (Number(l.quantity) * Number(l.sell_unit_price)).toFixed(2),
          buy_line_total: (Number(l.quantity) * Number(l.buy_unit_price || 0)).toFixed(2),
        };
      });
      const { error: lErr } = await supabase.from('quote_line').insert(rows);
      if (lErr) throw Object.assign(new Error(lErr.message), { stage: 'quote_line' });
    }

    await supabase.from('quote').update({ current_version_id: v.id }).eq('id', q.id);

    return json(201, {
      success: true,
      data: {
        quote_id: q.id,
        reference_number: q.reference_number,
        version_id: v.id,
        option_id: o.id,
        sell_total: priced ? sellTotal : null,
        buy_total: priced ? buyTotal : null,
        margin_percent: priced ? Number(margin.toFixed(2)) : null,
        requires_approval: priced ? needsApproval : false,
        line_count: lines.length,
      },
    });
  } catch (err) {
    if (made.version) await supabase.from('quote_version').delete().eq('id', made.version);
    if (made.quote) await supabase.from('quote').delete().eq('id', made.quote);
    if (made.request) await supabase.from('request').delete().eq('id', made.request);
    if (made.customer) await supabase.from('customer').delete().eq('id', made.customer);
    return json(500, { success: false, error: err.message, stage: err.stage || 'unknown' });
  }
};
