// POST only. Creates the full chain:
//   [customer?] -> request -> quote -> quote_version -> quote_option
// Unwinds what it made if a later step fails (no cross-call transaction).
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

// GLA-YYYY-MM-NNN, sequential within the month
async function nextReference() {
  const now = new Date();
  const prefix = `GLA-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const { data } = await supabase
    .from('quote')
    .select('reference_number')
    .like('reference_number', `${prefix}-%`)
    .order('reference_number', { ascending: false })
    .limit(1);
  const last = data?.[0]?.reference_number;
  const n = last ? parseInt(last.slice(prefix.length + 1), 10) + 1 : 1;
  return `${prefix}-${String(n).padStart(3, '0')}`;
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(200, {});
  if (event.httpMethod !== 'POST') return json(405, { success: false, error: 'POST only' });

  const made = { customer: null, request: null, quote: null, version: null };

  try {
    const caller = await getCaller(event);
    if (!caller) return json(401, { success: false, error: 'Sign in required' });

    // created_by FKs to users(id), not auth.users - caller must be synced
    const { data: userRow } = await supabase
      .from('users').select('id').eq('id', caller.id).single();
    if (!userRow) {
      return json(403, { success: false, error: 'Your account is not set up in this workspace yet' });
    }

    const { data: membership } = await supabase
      .from('team_member').select('team_id').eq('user_id', caller.id)
      .order('is_primary', { ascending: false }).limit(1);
    const teamId = membership?.[0]?.team_id;
    if (!teamId) return json(403, { success: false, error: 'You are not a member of any team' });

    const body = JSON.parse(event.body || '{}');
    const { title, customer_id, new_customer, description } = body;

    if (!title?.trim()) return json(400, { success: false, error: 'Title is required' });
    if (!customer_id && !new_customer) {
      return json(400, { success: false, error: 'Pick a customer or add a new one' });
    }

    // 1. customer (only if creating inline)
    let customerId = customer_id;
    if (!customerId) {
      if (!new_customer.name?.trim() || !new_customer.email?.trim()) {
        return json(400, { success: false, error: 'New customer needs a name and email' });
      }
      const { data: c, error: cErr } = await supabase.from('customer').insert([{
        name: new_customer.name.trim(),
        email: new_customer.email.trim().toLowerCase(),
        customer_type: new_customer.customer_type || 'shipper',
        city: new_customer.city || null,
        team_id: teamId,
        is_active: true,
      }]).select('id, name').single();
      if (cErr) {
        const dupe = cErr.code === '23505';
        return json(dupe ? 409 : 500, {
          success: false,
          error: dupe ? 'A customer with that email already exists' : cErr.message,
          stage: 'customer',
        });
      }
      made.customer = c.id;
      customerId = c.id;
    }

    // 2. request (quote.request_id is NOT NULL)
    const { data: req, error: rErr } = await supabase.from('request').insert([{
      customer_id: customerId,
      title: title.trim(),
      description: description || null,
      status: 'pending',
      team_id: teamId,
      created_by: caller.id,
      requested_at: new Date().toISOString(),
    }]).select('id').single();
    if (rErr) throw Object.assign(new Error(rErr.message), { stage: 'request' });
    made.request = req.id;

    // 3. quote
    const reference = await nextReference();
    const { data: q, error: qErr } = await supabase.from('quote').insert([{
      request_id: req.id,
      customer_id: customerId,
      reference_number: reference,
      status: 'draft',
      team_id: teamId,
      created_by: caller.id,
      expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
    }]).select('id, reference_number').single();
    if (qErr) throw Object.assign(new Error(qErr.message), { stage: 'quote' });
    made.quote = q.id;

    // 4. version 1 - totals stay NULL together (pricing_consistent check)
    const { data: v, error: vErr } = await supabase.from('quote_version').insert([{
      quote_id: q.id,
      version_number: 1,
      status: 'draft',
      requires_approval: false,
    }]).select('id').single();
    if (vErr) throw Object.assign(new Error(vErr.message), { stage: 'quote_version' });
    made.version = v.id;

    // 5. default option to hang lines off
    const { data: o, error: oErr } = await supabase.from('quote_option').insert([{
      quote_version_id: v.id,
      title: 'Standard',
      is_recommended: true,
    }]).select('id').single();
    if (oErr) throw Object.assign(new Error(oErr.message), { stage: 'quote_option' });

    await supabase.from('quote').update({ current_version_id: v.id }).eq('id', q.id);

    return json(201, {
      success: true,
      data: {
        quote_id: q.id,
        reference_number: q.reference_number,
        request_id: req.id,
        version_id: v.id,
        option_id: o.id,
        customer_id: customerId,
      },
    });

  } catch (err) {
    // unwind, deepest first
    if (made.version) await supabase.from('quote_version').delete().eq('id', made.version);
    if (made.quote)   await supabase.from('quote').delete().eq('id', made.quote);
    if (made.request) await supabase.from('request').delete().eq('id', made.request);
    if (made.customer) await supabase.from('customer').delete().eq('id', made.customer);
    return json(500, { success: false, error: err.message, stage: err.stage || 'unknown' });
  }
};
