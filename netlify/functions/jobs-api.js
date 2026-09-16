// netlify/functions/jobs-api.js
// SECURITY: service key, bypasses RLS. Same caveat as quotes-api.

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

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(200, {});

  try {
    const params = event.queryStringParameters || {};
    const status = params.status || 'all';

    // port is referenced twice (origin + destination), so each embed needs
    // an explicit alias naming the FK column, or Postgrest can't tell them apart
    let query = supabase
      .from('job')
      .select(`
        id,
        reference_number,
        status,
        created_at,
        tms_reference,
        customer:customer_id ( id, name ),
        service_type:service_type_id ( id, name ),
        carrier:carrier_id ( id, name ),
        origin_port:origin_port_id ( id, code, name ),
        destination_port:destination_port_id ( id, code, name )
      `, { count: 'exact' })
      .order('created_at', { ascending: false });

    if (status !== 'all') query = query.eq('status', status);

    const { data: jobs, error, count } = await query;
    if (error) return json(500, { success: false, error: error.message, stage: 'job' });

    const jobIds = jobs.map((j) => j.id);

    // next upcoming milestone per job
    let milestonesByJob = {};
    if (jobIds.length) {
      const { data: ms } = await supabase
        .from('job_milestone')
        .select('job_id, milestone_name, milestone_sequence, planned_date, status')
        .in('job_id', jobIds)
        .order('milestone_sequence', { ascending: true });

      for (const m of ms || []) {
        if (!milestonesByJob[m.job_id]) milestonesByJob[m.job_id] = [];
        milestonesByJob[m.job_id].push(m);
      }
    }

    const rows = jobs.map((j) => {
      const ms = milestonesByJob[j.id] || [];
      const next = ms.find((m) => m.status !== 'completed') || null;
      return {
        id: j.id,
        reference_number: j.reference_number,
        status: j.status,
        created_at: j.created_at,
        tms_reference: j.tms_reference,
        customer_name: j.customer?.name ?? null,
        service_type: j.service_type?.name ?? null,
        carrier_name: j.carrier?.name ?? null,
        origin: j.origin_port?.name ?? null,
        origin_code: j.origin_port?.code ?? null,
        destination: j.destination_port?.name ?? null,
        destination_code: j.destination_port?.code ?? null,
        milestones_total: ms.length,
        milestones_done: ms.filter((m) => m.status === 'completed').length,
        next_milestone: next?.milestone_name ?? null,
        next_milestone_date: next?.planned_date ?? null,
      };
    });

    return json(200, { success: true, data: rows, total: count ?? rows.length });
  } catch (err) {
    return json(500, { success: false, error: err.message, stack: err.stack });
  }
};
