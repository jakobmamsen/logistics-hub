// netlify/functions/tasks-api.js
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
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
  },
  body: JSON.stringify(payload),
});

// Netlify lowercases header names and gives a plain object - NOT .get()
async function getCaller(event) {
  const auth = event.headers?.authorization || event.headers?.Authorization;
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return null;
  const { data, error } = await supabase.auth.getUser(token);
  return error ? null : data.user;
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(200, {});

  try {
    const caller = await getCaller(event);   // null for now = still allowed
    const params = event.queryStringParameters || {};
    const status = params.status || 'all';
    const assigned = params.assigned || 'all';

    // task has NO deleted_at and NO quote_id column
    let query = supabase
      .from('task')
      .select(`
        id, title, description, status, priority, due_date,
        created_at, started_at, completed_at,
        job_id,
        job:job_id ( id, reference_number, status ),
        assignee:assigned_to ( id, name, email )
      `, { count: 'exact' })
      .order('due_date', { ascending: true, nullsFirst: false });

    if (status !== 'all') query = query.eq('status', status);
    if (assigned === 'me' && caller) query = query.eq('assigned_to', caller.id);

    const { data, count, error } = await query;
    if (error) return json(500, { success: false, error: error.message, stage: 'task' });

    const now = new Date();
    const soon = new Date(now.getTime() + 3 * 86400000);
    const live = (t) => t.status !== 'completed' && t.status !== 'cancelled';

    const rows = (data || []).map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      status: t.status,
      priority: t.priority,
      due_date: t.due_date,
      created_at: t.created_at,
      job_id: t.job_id,
      job_reference: t.job?.reference_number ?? null,
      assignee_name: t.assignee?.name ?? null,
      is_overdue: !!(t.due_date && live(t) && new Date(t.due_date) < now),
    }));

    return json(200, {
      success: true,
      data: rows,
      total: count ?? rows.length,
      overdue: rows.filter((t) => t.is_overdue).length,
      dueSoon: rows.filter((t) =>
        t.due_date && !t.is_overdue &&
        new Date(t.due_date) <= soon &&
        t.status !== 'completed' && t.status !== 'cancelled'
      ).length,
      authenticated: !!caller,
    });
  } catch (err) {
    return json(500, { success: false, error: err.message, stack: err.stack });
  }
};
