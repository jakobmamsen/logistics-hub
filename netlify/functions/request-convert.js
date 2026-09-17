// POST - converts an existing request into a draft quote.
// request -> quote -> quote_version -> quote_option, then marks request 'quoted'.
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
  const { data } = await supabase
    .from('quote').select('reference_number')
    .like('reference_number', `${prefix}-%`)
    .order('reference_number', { ascending: false }).limit(1);
  const last = data?.[0]?.reference_number;
  const n = last ? parseInt(last.slice(prefix.length + 1), 10) + 1 : 1;
  return `${prefix}-${String(n).padStart(3, '0')}`;
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(200, {});
  if (event.httpMethod !== 'POST') return json(405, { success: false, error: 'POST only' });

  const made = { quote: null, version: null };

  try {
    const caller = await getCaller(event);
    if (!caller) return json(401, { success: false, error: 'Sign in required' });

    const { data: userRow } = await supabase
      .from('users').select('id').eq('id', caller.id).single();
    if (!userRow) return json(403, { success: false, error: 'Account not set up in this workspace' });

    const b = JSON.parse(event.body || '{}');
    if (!b.request_id) return json(400, { success: false, error: 'request_id is required' });

    // the request carries customer and team - don't re-ask the client for them
    const { data: req, error: rErr } = await supabase
      .from('request').select('id, customer_id, team_id, status, title')
      .eq('id', b.request_id).single();
    if (rErr || !req) return json(404, { success: false, error: 'Request not found' });

    const validDays = Number(b.valid_days) > 0 ? Number(b.valid_days) : 30;
    const reference = await nextReference();

    const { data: q, error: qErr } = await supabase.from('quote').insert([{
      request_id: req.id,
      customer_id: req.customer_id,
      reference_number: reference,
      status: 'draft',
      team_id: req.team_id,
      created_by: caller.id,
      expires_at: new Date(Date.now() + validDays * 86400000).toISOString(),
    }]).select('id, reference_number, expires_at').single();
    if (qErr) throw Object.assign(new Error(qErr.message), { stage: 'quote' });
    made.quote = q.id;

    // incoterm and payment terms belong to the version, not the quote
    const { data: v, error: vErr } = await supabase.from('quote_version').insert([{
      quote_id: q.id,
      version_number: 1,
      status: 'draft',
      requires_approval: false,
      incoterm_id: b.incoterm_id || null,
      payment_terms: b.payment_terms || null,
      notes: b.notes || null,
    }]).select('id').single();
    if (vErr) throw Object.assign(new Error(vErr.message), { stage: 'quote_version' });
    made.version = v.id;

    const { data: o, error: oErr } = await supabase.from('quote_option').insert([{
      quote_version_id: v.id,
      title: b.option_title || 'Standard',
      transport_mode: b.transport_mode || null,
      transit_days: b.transit_days || null,
      is_recommended: true,
    }]).select('id').single();
    if (oErr) throw Object.assign(new Error(oErr.message), { stage: 'quote_option' });

    await supabase.from('quote').update({ current_version_id: v.id }).eq('id', q.id);

    // enquiry has been quoted
    if (req.status === 'pending') {
      await supabase.from('request')
        .update({ status: 'quoted', updated_at: new Date().toISOString() })
        .eq('id', req.id);
    }

    return json(201, {
      success: true,
      data: {
        quote_id: q.id,
        reference_number: q.reference_number,
        expires_at: q.expires_at,
        version_id: v.id,
        option_id: o.id,
      },
    });
  } catch (err) {
    if (made.version) await supabase.from('quote_version').delete().eq('id', made.version);
    if (made.quote) await supabase.from('quote').delete().eq('id', made.quote);
    return json(500, { success: false, error: err.message, stage: err.stage || 'unknown' });
  }
};
