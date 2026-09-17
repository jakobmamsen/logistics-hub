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
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  },
  body: JSON.stringify(p),
});

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(200, {});

  try {
    const params = event.queryStringParameters || {};
    const { id, status = 'all' } = params;

    const select = `
      id, title, description, status, created_at, updated_at,
      origin_city, destination_city, required_by_date, requested_at,
      requested_by_name, requested_by_email, requested_by_phone,
      customer:customer_id ( id, name, customer_type, email ),
      service_type:service_type_id ( id, name ),
      origin_country:origin_country_id ( id, code, name ),
      destination_country:destination_country_id ( id, code, name )
    `;

    // single request + any quotes already made from it
    if (id) {
      const { data: r, error } = await supabase
        .from('request').select(select).eq('id', id).single();
      if (error) return json(404, { success: false, error: 'Request not found' });

      const { data: quotes } = await supabase
        .from('quote')
        .select('id, reference_number, status, created_at, expires_at')
        .eq('request_id', id)
        .order('created_at', { ascending: false });

      return json(200, {
        success: true,
        data: {
          ...r,
          customer_name: r.customer?.name ?? null,
          service_type_name: r.service_type?.name ?? null,
          quotes: quotes || [],
        },
      });
    }

    let q = supabase.from('request').select(select, { count: 'exact' })
      .order('created_at', { ascending: false });
    if (status !== 'all') q = q.eq('status', status);

    const { data, count, error } = await q;
    if (error) return json(500, { success: false, error: error.message });

    const ids = (data || []).map((r) => r.id);
    let quoteCount = {};
    if (ids.length) {
      const { data: qs } = await supabase
        .from('quote').select('request_id').in('request_id', ids);
      for (const row of qs || []) {
        quoteCount[row.request_id] = (quoteCount[row.request_id] || 0) + 1;
      }
    }

    const rows = (data || []).map((r) => ({
      id: r.id,
      title: r.title,
      status: r.status,
      created_at: r.created_at,
      required_by_date: r.required_by_date,
      customer_id: r.customer?.id ?? null,
      customer_name: r.customer?.name ?? null,
      service_type_name: r.service_type?.name ?? null,
      origin_city: r.origin_city,
      destination_city: r.destination_city,
      requested_by_name: r.requested_by_name,
      quote_count: quoteCount[r.id] || 0,
    }));

    return json(200, {
      success: true,
      data: rows,
      total: count ?? rows.length,
      pending: rows.filter((r) => r.status === 'pending').length,
      quoted: rows.filter((r) => r.status === 'quoted').length,
    });
  } catch (err) {
    return json(500, { success: false, error: err.message });
  }
};
