// Lookup values for form dropdowns.
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
    const [st, inc, cur, un, cc, cat] = await Promise.all([
      supabase.from('service_type').select('id, name, is_active').eq('is_active', true).order('name'),
      supabase.from('incoterm').select('id, code, description').order('code'),
      supabase.from('currency').select('id, code, name, symbol').order('code'),
      supabase.from('unit').select('id, code, description').order('code'),
      supabase.from('charge_category').select('id, category, description').order('category'),
      supabase.from('line_item_catalog')
        .select('id, category, category_name, subcategory_id, name, unit, commodity_type, is_active')
        .eq('is_active', true).order('category'),
    ]);

    return json(200, {
      success: true,
      data: {
        service_types: st.data || [],
        incoterms: inc.data || [],
        currencies: cur.data || [],
        units: un.data || [],
        charge_categories: cc.data || [],
        catalog: cat.data || [],
      },
    });
  } catch (err) {
    return json(500, { success: false, error: err.message });
  }
};
