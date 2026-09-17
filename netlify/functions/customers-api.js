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
    const { data, error } = await supabase
      .from('customer')
      .select('id, name, customer_type, email, city, is_active')
      .eq('is_active', true)
      .order('name');
    if (error) return json(500, { success: false, error: error.message });
    return json(200, { success: true, data: data || [] });
  } catch (err) {
    return json(500, { success: false, error: err.message });
  }
};
