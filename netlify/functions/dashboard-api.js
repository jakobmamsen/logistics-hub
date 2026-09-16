// netlify/functions/dashboard-api.js
// Single endpoint: returns all dashboard metrics + recent activity in one call.
//
// SECURITY: uses the service key, so RLS is bypassed. Anyone with this URL
// sees everything. Fix before real data - see note at bottom of quotes-api.js.

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

function formatTimeAgo(timestamp) {
  const secondsAgo = Math.floor((Date.now() - new Date(timestamp)) / 1000);
  if (secondsAgo < 60) return 'just now';
  if (secondsAgo < 3600) return `${Math.floor(secondsAgo / 60)}m ago`;
  if (secondsAgo < 86400) return `${Math.floor(secondsAgo / 3600)}h ago`;
  if (secondsAgo < 604800) return `${Math.floor(secondsAgo / 86400)}d ago`;
  return new Date(timestamp).toLocaleDateString('en-GB');
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(200, {});

  try {
    const params = event.queryStringParameters || {};
    const teamId = params.team_id || null;   // optional filter

    // --- jobs for this team -------------------------------------------
    // task / pre_alert / exception have NO team_id column. They hang off
    // job, so we resolve the team's job ids first and filter by those.
    let jobQuery = supabase
      .from('job')
      .select('id, reference_number, status, created_at');
    if (teamId) jobQuery = jobQuery.eq('team_id', teamId);

    const { data: jobs, error: jobErr } = await jobQuery;
    if (jobErr) return json(500, { success: false, error: jobErr.message, stage: 'job' });

    const jobIds = jobs.map((j) => j.id);

    // --- quotes -------------------------------------------------------
    let quoteQuery = supabase
      .from('quote')
      .select('id, reference_number, status, created_at');
    if (teamId) quoteQuery = quoteQuery.eq('team_id', teamId);

    const { data: quotes, error: qErr } = await quoteQuery;
    if (qErr) return json(500, { success: false, error: qErr.message, stage: 'quote' });

    // --- tasks / pre-alerts / exceptions (via job ids) ----------------
    let tasks = [], preAlerts = [], exceptions = [];

    if (jobIds.length > 0) {
      const [tRes, pRes, eRes] = await Promise.all([
        supabase.from('task')
          .select('id, title, status, priority, due_date, created_at')
          .in('job_id', jobIds),
        supabase.from('pre_alert')
          .select('id, status, created_at')
          .in('job_id', jobIds),
        supabase.from('exception')
          .select('id, exception_type, severity, status, created_at')
          .in('job_id', jobIds),
      ]);

      if (tRes.error) return json(500, { success: false, error: tRes.error.message, stage: 'task' });
      if (pRes.error) return json(500, { success: false, error: pRes.error.message, stage: 'pre_alert' });
      if (eRes.error) return json(500, { success: false, error: eRes.error.message, stage: 'exception' });

      tasks = tRes.data;
      preAlerts = pRes.data;
      exceptions = eRes.data;
    }

    // --- metrics ------------------------------------------------------
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const within = (d) => new Date(d).getTime() >= oneWeekAgo;

    const metrics = {
      quotes: {
        total:    quotes.length,
        draft:    quotes.filter((q) => q.status === 'draft').length,
        approved: quotes.filter((q) => q.status === 'approved').length,
        sent:     quotes.filter((q) => q.status === 'sent').length,
        won:      quotes.filter((q) => q.status === 'won').length,
      },
      jobs: {
        total:     jobs.length,
        pending:   jobs.filter((j) => j.status === 'pending').length,
        active:    jobs.filter((j) => j.status === 'active').length,
        completed: jobs.filter((j) => j.status === 'completed').length,
      },
      tasks: {
        total:      tasks.length,
        open:       tasks.filter((t) => t.status === 'open').length,
        inProgress: tasks.filter((t) => t.status === 'in_progress').length,
        overdue:    tasks.filter((t) =>
                      t.due_date &&
                      t.status !== 'completed' &&
                      new Date(t.due_date) < new Date()
                    ).length,
      },
      preAlerts: {
        total:   preAlerts.length,
        pending: preAlerts.filter((p) => p.status === 'pending').length,
      },
      exceptions: {
        total:    exceptions.length,
        open:     exceptions.filter((e) => e.status === 'open').length,
        critical: exceptions.filter((e) => e.severity === 'critical').length,
      },
      weekActivity: {
        quotes: quotes.filter((q) => within(q.created_at)).length,
        jobs:   jobs.filter((j) => within(j.created_at)).length,
        tasks:  tasks.filter((t) => within(t.created_at)).length,
      },
    };

    // --- recent activity feed -----------------------------------------
    const activity = [
      ...quotes.map((q) => ({
        id: q.id,
        type: 'quote',
        title: `Quote ${q.reference_number}`,
        action: q.status.charAt(0).toUpperCase() + q.status.slice(1),
        raw: q.created_at,
      })),
      ...jobs.map((j) => ({
        id: j.id,
        type: 'job',
        title: `Job ${j.reference_number}`,
        action: j.status.charAt(0).toUpperCase() + j.status.slice(1),
        raw: j.created_at,
      })),
      ...exceptions.map((e) => ({
        id: e.id,
        type: 'exception',
        title: e.exception_type,
        action: e.severity,
        raw: e.created_at,
      })),
    ]
      .sort((a, b) => new Date(b.raw) - new Date(a.raw))
      .slice(0, 10)
      .map(({ raw, ...rest }) => ({ ...rest, timestamp: formatTimeAgo(raw) }));

    return json(200, { success: true, data: { metrics, activity } });

  } catch (err) {
    return json(500, { success: false, error: err.message, stack: err.stack });
  }
};
