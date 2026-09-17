// POST { quote_id, ... } - edits a DRAFT quote in place.
// Submitted versions are immutable by design: revising one means a new
// version, not an edit. This endpoint refuses anything but a draft.
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

function chargeFor(sub) {
  if (sub === 'customs') return 'customs';
  if (sub === 'insurance') return 'insurance';
  if (['port_origin', 'port_destination', 'othc', 'dthc', 'drayage',
       'exw_pickup', 'dap_delivery'].includes(sub)) return 'handling';
  if (['ectn', 'doc_fee'].includes(sub)) return 'documentation';
  return 'freight';
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(200, {});
  if (event.httpMethod !== 'POST') return json(405, { success: false, error: 'POST only' });

  try {
    const caller = await getCaller(event);
    if (!caller) return json(401, { success: false, error: 'Sign in required' });

    const b = JSON.parse(event.body || '{}');
    if (!b.quote_id) return json(400, { success: false, error: 'quote_id required' });

    const { data: q } = await supabase
      .from('quote')
      .select('id, status, request_id, current_version_id')
      .eq('id', b.quote_id).single();
    if (!q) return json(404, { success: false, error: 'Quote not found' });

    if (q.status !== 'draft') {
      return json(409, {
        success: false,
        error: `This quote is ${q.status} and can no longer be edited. Create a new version to revise it.`,
      });
    }

    // 1. enquiry fields live on request
    const reqPatch = {};
    if (b.title !== undefined) reqPatch.title = b.title?.trim();
    if (b.description !== undefined) reqPatch.description = b.description || null;
    if (b.origin_city !== undefined) reqPatch.origin_city = b.origin_city || null;
    if (b.destination_city !== undefined) reqPatch.destination_city = b.destination_city || null;
    if (b.service_type_id !== undefined) reqPatch.service_type_id = b.service_type_id || null;
    if (b.required_by_date !== undefined) reqPatch.required_by_date = b.required_by_date || null;
    if (Object.keys(reqPatch).length) {
      reqPatch.updated_at = new Date().toISOString();
      const { error } = await supabase.from('request').update(reqPatch).eq('id', q.request_id);
      if (error) return json(500, { success: false, error: error.message, stage: 'request' });
    }

    // 2. validity on quote
    if (b.valid_days !== undefined) {
      const { error } = await supabase.from('quote').update({
        expires_at: new Date(Date.now() + (Number(b.valid_days) || 30) * 86400000).toISOString(),
        updated_at: new Date().toISOString(),
      }).eq('id', q.id);
      if (error) return json(500, { success: false, error: error.message, stage: 'quote' });
    }

    const versionId = q.current_version_id;
    if (!versionId) return json(500, { success: false, error: 'Quote has no current version' });

    // 3. lines - replace wholesale, simpler than diffing and safe on a draft
    let totals = null;
    if (Array.isArray(b.lines)) {
      const { data: opts } = await supabase
        .from('quote_option').select('id').eq('quote_version_id', versionId)
        .order('is_recommended', { ascending: false }).limit(1);
      const optionId = opts?.[0]?.id;
      if (!optionId) return json(500, { success: false, error: 'Quote has no option' });

      const [{ data: cats }, { data: units }, { data: catalog }] = await Promise.all([
        supabase.from('charge_category').select('id, category'),
        supabase.from('unit').select('id, code'),
        supabase.from('line_item_catalog').select('id, name, subcategory_id, unit'),
      ]);

      await supabase.from('quote_line').delete().eq('quote_option_id', optionId);

      if (b.lines.length) {
        const rows = b.lines.map((l) => {
          const item = catalog.find((c) => c.id === l.catalog_id);
          const sub = item?.subcategory_id || '';
          const unitCode = item?.unit === 'Shipment' ? 'shipment' : 'container';
          return {
            quote_option_id: optionId,
            charge_category_id: cats.find((c) => c.category === chargeFor(sub))?.id,
            description: l.description || item?.name || 'Line item',
            quantity: Number(l.quantity),
            unit_id: units.find((u) => u.code === unitCode)?.id,
            sell_unit_price: Number(l.sell_unit_price),
            sell_currency: l.currency || 'EUR',
            buy_unit_price: l.buy_unit_price ? Number(l.buy_unit_price) : null,
            buy_currency: l.buy_unit_price ? (l.currency || 'EUR') : null,
            fx_rate: 1.0,
            sell_line_total: (Number(l.quantity) * Number(l.sell_unit_price)).toFixed(2),
            buy_line_total: (Number(l.quantity) * Number(l.buy_unit_price || 0)).toFixed(2),
          };
        });
        const { error } = await supabase.from('quote_line').insert(rows);
        if (error) return json(500, { success: false, error: error.message, stage: 'quote_line' });
      }

      // recalculate server-side; margin = profit / sell
      const sell = b.lines.reduce((s, l) => s + Number(l.quantity) * Number(l.sell_unit_price), 0);
      const buy = b.lines.reduce((s, l) => s + Number(l.quantity) * Number(l.buy_unit_price || 0), 0);
      const profit = sell - buy;
      const margin = sell > 0 ? (profit / sell) * 100 : null;
      totals = {
        sell, buy, profit, margin,
        requires_approval: b.lines.length > 0 && (margin < 15 || sell > 10000),
      };
    }

    // 4. version fields
    const vPatch = {};
    if (b.incoterm_id !== undefined) vPatch.incoterm_id = b.incoterm_id || null;
    if (b.payment_terms !== undefined) vPatch.payment_terms = b.payment_terms || null;
    if (b.notes !== undefined) vPatch.notes = b.notes || null;

    if (totals) {
      const priced = b.lines.length > 0;
      // all four together or all null - pricing_consistent constraint
      vPatch.sell_total = priced ? totals.sell.toFixed(2) : null;
      vPatch.buy_total = priced ? totals.buy.toFixed(2) : null;
      vPatch.gross_profit = priced ? totals.profit.toFixed(2) : null;
      vPatch.margin_percent = priced ? totals.margin.toFixed(2) : null;
      vPatch.requires_approval = priced ? totals.requires_approval : false;
      vPatch.approval_reason = priced && totals.requires_approval
        ? (totals.margin < 15 ? 'Margin below 15%' : 'Value above EUR 10,000') : null;
    }

    if (Object.keys(vPatch).length) {
      const { error } = await supabase.from('quote_version').update(vPatch).eq('id', versionId);
      if (error) return json(500, { success: false, error: error.message, stage: 'quote_version' });
    }

    if (b.transit_days !== undefined || b.option_title !== undefined) {
      const oPatch = {};
      if (b.transit_days !== undefined) oPatch.transit_days = b.transit_days ? Number(b.transit_days) : null;
      if (b.option_title !== undefined) oPatch.title = b.option_title || 'Standard';
      await supabase.from('quote_option').update(oPatch).eq('quote_version_id', versionId);
    }

    return json(200, {
      success: true,
      data: {
        quote_id: q.id,
        ...(totals && {
          sell_total: totals.sell,
          margin_percent: Number(totals.margin?.toFixed(2)),
          requires_approval: totals.requires_approval,
        }),
      },
    });
  } catch (err) {
    return json(500, { success: false, error: err.message });
  }
};
