// GET ?id= -> one quote with version, option and lines nested.
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
    const id = event.queryStringParameters?.id;
    if (!id) return json(400, { success: false, error: 'id required' });

    const { data: q, error } = await supabase
      .from('quote')
      .select(`
        id, reference_number, status, created_at, updated_at, expires_at,
        customer_id, request_id, current_version_id,
        customer:customer_id ( id, name, email, phone, city, customer_type ),
        request:request_id ( id, title, description, origin_city, destination_city,
                             required_by_date, service_type_id,
                             service_type:service_type_id ( id, name ) )
      `)
      .eq('id', id).single();
    if (error || !q) return json(404, { success: false, error: 'Quote not found' });

    const { data: versions } = await supabase
      .from('quote_version')
      .select(`
        id, version_number, status, requires_approval, approval_reason,
        buy_total, sell_total, gross_profit, margin_percent, sell_total_currency,
        payment_terms, notes, incoterm_id, created_at, submitted_at, approved_at,
        incoterm:incoterm_id ( id, code )
      `)
      .eq('quote_id', id)
      .order('version_number', { ascending: false });

    const current = versions?.find((v) => v.id === q.current_version_id)
      || versions?.[0] || null;

    let options = [];
    if (current) {
      const { data: opts } = await supabase
        .from('quote_option')
        .select('id, title, description, transport_mode, transit_days, is_recommended')
        .eq('quote_version_id', current.id)
        .order('is_recommended', { ascending: false });
      options = opts || [];

      if (options.length) {
        const { data: lines } = await supabase
          .from('quote_line')
          .select(`
            id, quote_option_id, description, quantity,
            sell_unit_price, sell_currency, sell_line_total,
            buy_unit_price, buy_currency, buy_line_total,
            charge_category_id, unit_id,
            charge_category:charge_category_id ( id, category ),
            unit:unit_id ( id, code )
          `)
          .in('quote_option_id', options.map((o) => o.id))
          .order('id');

        options = options.map((o) => ({
          ...o,
          lines: (lines || []).filter((l) => l.quote_option_id === o.id),
        }));
      }
    }

    return json(200, {
      success: true,
      data: {
        ...q,
        customer_name: q.customer?.name ?? null,
        title: q.request?.title ?? null,
        origin_city: q.request?.origin_city ?? null,
        destination_city: q.request?.destination_city ?? null,
        service_type_name: q.request?.service_type?.name ?? null,
        current_version: current,
        versions: versions || [],
        options,
        // drafts are editable in place; anything else needs a new version
        editable: q.status === 'draft',
      },
    });
  } catch (err) {
    return json(500, { success: false, error: err.message });
  }
};
