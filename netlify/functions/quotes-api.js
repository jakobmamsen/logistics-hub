// netlify/functions/quotes-api.js
// Self-contained. No middleware import - fewer moving parts while we get this working.
//
// NOTE ON SECURITY: this uses the service key, which bypasses Row Level Security.
// That means ANYONE who hits this URL gets every quote in the database.
// Fine for getting the pipeline working; must be fixed before real users. See bottom.

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_KEY   // service key - bypasses RLS
);

const json = (statusCode, payload) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  },
  body: JSON.stringify(payload),
});

export const handler = async (event) => {
  // CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return json(200, {});
  }

  try {
    const params = event.queryStringParameters || {};
    const status = params.status || 'all';
    const limit = parseInt(params.limit, 10) || 50;

    // --- Query 1: quotes, with the customer name joined in ---------------
    // customer join is unambiguous: quote.customer_id -> customer.id
    let query = supabase
      .from('quote')
      .select(`
        id,
        reference_number,
        status,
        created_at,
        expires_at,
        team_id,
        customer_id,
        current_version_id,
        customer ( id, name, customer_type )
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(limit);

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    const { data: quotes, count, error } = await query;

    if (error) {
      return json(500, {
        success: false,
        error: error.message,
        hint: error.hint || null,
        details: error.details || null,
        stage: 'quote query',
      });
    }

    // --- Query 2: versions, fetched separately -----------------------------
    // Two FKs exist between quote and quote_version (quote_version.quote_id,
    // and quote.current_version_id). Embedding would raise an ambiguous-
    // relationship error, so we fetch and merge in JS instead.
    const versionIds = quotes.map(q => q.current_version_id).filter(Boolean);

    let versionsById = {};
    if (versionIds.length > 0) {
      const { data: versions, error: vErr } = await supabase
        .from('quote_version')
        .select('id, version_number, sell_total, buy_total, margin_percent, sell_total_currency')
        .in('id', versionIds);

      if (vErr) {
        return json(500, {
          success: false,
          error: vErr.message,
          stage: 'quote_version query',
        });
      }

      versionsById = Object.fromEntries(versions.map(v => [v.id, v]));
    }

    // --- Flatten into the shape the UI wants -------------------------------
    const rows = quotes.map((q) => {
      const v = versionsById[q.current_version_id] || {};
      return {
        id: q.id,
        reference_number: q.reference_number,
        status: q.status,
        created_at: q.created_at,
        expires_at: q.expires_at,
        customer_id: q.customer_id,
        customer_name: q.customer?.name ?? null,
        customer_type: q.customer?.customer_type ?? null,
        version_number: v.version_number ?? null,
        sell_total: v.sell_total ?? null,
        buy_total: v.buy_total ?? null,
        margin_percent: v.margin_percent ?? null,
        currency: v.sell_total_currency ?? 'EUR',
      };
    });

    return json(200, {
      success: true,
      data: rows,
      total: count ?? rows.length,
    });

  } catch (err) {
    return json(500, {
      success: false,
      error: err.message,
      stack: err.stack,
    });
  }
};

// ---------------------------------------------------------------------------
// TO SECURE THIS LATER:
//   1. Read the caller's token:  event.headers.authorization  (plain object,
//      lowercase key - NOT .get()). Netlify lowercases header names.
//   2. Verify it:  await supabase.auth.getUser(token)
//   3. Look up their team from team_member, then .eq('team_id', theirTeam)
//   4. Or better: build a per-request client with the ANON key + the user's
//      token, so Postgres RLS applies automatically and you don't hand-roll
//      the team filter at all.
// ---------------------------------------------------------------------------