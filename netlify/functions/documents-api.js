// netlify/functions/documents-api.js
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

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(200, {});

  try {
    const caller = await getCaller(event);
    const params = event.queryStringParameters || {};
    const status = params.status || 'all';
    const jobId = params.job_id || null;

    // document has NO team_id and NO updated_at; job_id is NOT NULL
    let query = supabase
      .from('document')
      .select(`
        id, file_name, file_path, file_size_bytes, mime_type,
        current_version, status, uploaded_at, job_id,
        document_type:document_type_id ( id, code, name, is_mandatory_for_export ),
        job:job_id ( id, reference_number, status ),
        uploader:uploaded_by ( id, name )
      `, { count: 'exact' })
      .order('uploaded_at', { ascending: false });

    if (status !== 'all') query = query.eq('status', status);
    if (jobId) query = query.eq('job_id', jobId);

    const { data, count, error } = await query;
    if (error) return json(500, { success: false, error: error.message, stage: 'document' });

    const rows = (data || []).map((d) => ({
      id: d.id,
      file_name: d.file_name,
      file_path: d.file_path,
      file_size_bytes: d.file_size_bytes,
      mime_type: d.mime_type,
      current_version: d.current_version,
      status: d.status,
      uploaded_at: d.uploaded_at,
      job_id: d.job_id,
      job_reference: d.job?.reference_number ?? null,
      document_type: d.document_type?.name ?? null,
      document_type_code: d.document_type?.code ?? null,
      is_mandatory: d.document_type?.is_mandatory_for_export ?? false,
      uploaded_by_name: d.uploader?.name ?? null,
    }));

    return json(200, {
      success: true,
      data: rows,
      total: count ?? rows.length,
      active: rows.filter((r) => r.status === 'active').length,
      mandatory: rows.filter((r) => r.is_mandatory).length,
      authenticated: !!caller,
    });
  } catch (err) {
    return json(500, { success: false, error: err.message });
  }
};
