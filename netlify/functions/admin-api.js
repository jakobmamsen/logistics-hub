// netlify/functions/admin-api.js
// READ ONLY, and the only endpoint here that enforces auth.
// Writes (create user / change role / deactivate) deliberately omitted -
// they must not run on a service-key client without a verified admin caller.

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

async function isAdmin(userId) {
  const { data } = await supabase
    .from('role_assignment')
    .select('role:role_id ( name )')
    .eq('user_id', userId);
  return (data || []).some((r) => r.role?.name === 'admin');
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(200, {});

  try {
    // Enforced, not advisory.
    const caller = await getCaller(event);
    if (!caller) {
      return json(401, { success: false, error: 'Sign in required' });
    }
    if (!(await isAdmin(caller.id))) {
      return json(403, { success: false, error: 'Admin access required' });
    }

    // users - real columns only
    const { data: users, error: uErr } = await supabase
      .from('users')
      .select('id, email, name, status, created_at')
      .order('created_at', { ascending: false });
    if (uErr) return json(500, { success: false, error: uErr.message, stage: 'users' });

    // roles come from role_assignment, NOT team_member
    const { data: assignments } = await supabase
      .from('role_assignment')
      .select('user_id, team_id, role:role_id ( name ), team:team_id ( name )');

    // team_member uses added_at, and has no role column
    const { data: members } = await supabase
      .from('team_member')
      .select('user_id, is_primary, added_at, team:team_id ( id, name )');

    const { data: teams } = await supabase
      .from('team')
      .select('id, name, business_area, region, is_active')
      .order('name');

    const rows = (users || []).map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      status: u.status,
      created_at: u.created_at,
      roles: (assignments || [])
        .filter((a) => a.user_id === u.id)
        .map((a) => ({ role: a.role?.name, team: a.team?.name ?? 'global' })),
      teams: (members || [])
        .filter((m) => m.user_id === u.id)
        .map((m) => ({ name: m.team?.name, is_primary: m.is_primary })),
    }));

    return json(200, {
      success: true,
      data: {
        users: rows,
        teams: teams || [],
        counts: {
          users: rows.length,
          active: rows.filter((u) => u.status === 'active').length,
          admins: rows.filter((u) => u.roles.some((r) => r.role === 'admin')).length,
          teams: (teams || []).length,
        },
      },
    });
  } catch (err) {
    return json(500, { success: false, error: err.message });
  }
};
