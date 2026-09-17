// netlify/functions/pre-alerts-api.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_KEY
);

const json = (statusCode, payload) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  },
  body: JSON.stringify(payload),
});

async function getCaller(event) {
  const auth = event.headers?.authorization || event.headers?.Authorization;
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return null;
  const { data, error } = await supabase.auth.getUser(token);
  return error ? null : data.user;
}

// checklist_items is JSONB. Seed data uses { items: [...] }, the schema
// comment describes a bare array - accept either.
function checklist(raw) {
  if (Array.isArray(raw)) return raw;
  if (raw && Array.isArray(raw.items)) return raw.items;
  return [];
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(200, {});

  try {
    const caller = await getCaller(event);
    const params = event.queryStringParameters || {};
    const status = params.status || 'all';

    // pre_alert has NO team_id - it hangs off job. Valid statuses:
    // pending, sent, acknowledged (NOT 'cleared')
    let query = supabase
      .from('pre_alert')
      .select(`
        id, status, checklist_items, sent_at, sent_via,
        acknowledged_by_authorities_at, reference_number,
        created_at, updated_at, job_id,
        job:job_id ( id, reference_number, status, origin_city, destination_city ),
        sender:sent_by ( id, name )
      `, { count: 'exact' })
      .order('created_at', { ascending: false });

    if (status !== 'all') query = query.eq('status', status);

    const { data, count, error } = await query;
    if (error) return json(500, { success: false, error: error.message, stage: 'pre_alert' });

    const rows = (data || []).map((p) => {
      const items = checklist(p.checklist_items);
      const done = items.filter((i) => i.completed).length;
      const required = items.filter((i) => i.required !== false);
      return {
        id: p.id,
        status: p.status,
        job_id: p.job_id,
        job_reference: p.job?.reference_number ?? null,
        route: p.job?.origin_city && p.job?.destination_city
          ? `${p.job.origin_city} - ${p.job.destination_city}` : null,
        reference_number: p.reference_number,
        sent_at: p.sent_at,
        sent_via: p.sent_via,
        sent_by_name: p.sender?.name ?? null,
        acknowledged_at: p.acknowledged_by_authorities_at,
        created_at: p.created_at,
        checklist_total: items.length,
        checklist_done: done,
        checklist_incomplete: required.filter((i) => !i.completed).length,
        checklist_items: items,
      };
    });

    return json(200, {
      success: true,
      data: rows,
      total: count ?? rows.length,
      pending: rows.filter((r) => r.status === 'pending').length,
      sent: rows.filter((r) => r.status === 'sent').length,
      acknowledged: rows.filter((r) => r.status === 'acknowledged').length,
      authenticated: !!caller,
    });
  } catch (err) {
    return json(500, { success: false, error: err.message });
  }
};
