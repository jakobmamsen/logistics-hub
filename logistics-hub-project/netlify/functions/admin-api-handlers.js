// ============================================================================
// LOGISTICS HUB RELEASE 1 — ADMIN API HANDLERS
// ============================================================================
// File: admin-api-handlers.js
// Purpose: Admin operations (users, roles, audit, settings)
// Dependencies: Supabase, JWT, middleware
// Status: Production-ready for Release 1
//
// Endpoints:
// 1. User Management (CRUD)
// 2. Role Assignment (CRUD)
// 3. Audit Log Viewer (Read-only)
// 4. System Settings (CRUD)
// 5. API Key Management (CRUD)
//
// ============================================================================

import { supabase } from '../supabase.js';
import { asyncHandler } from '../api-middleware.js';
import { validateInput, requirePermission, sanitizeOutput } from '../api-utils.js';

// ============================================================================
// USERS ENDPOINTS
// ============================================================================

/**
 * GET /api/admin/users
 * List all users with their role assignments
 */
export const listUsers = asyncHandler(async (req, context) => {
  // Check permission
  await requirePermission(context, 'user', 'read');

  const teamId = context.teams.primaryTeam.id;

  // Get users in this team
  const { data: users, error } = await supabase
    .from('team_member')
    .select(
      `
      user_id,
      user:users (
        id, email, user_metadata,
        role_assignments:role_assignment (
          id, role_id, team_id,
          role:role (id, name, display_name)
        )
      )
      `
    )
    .eq('team_id', teamId)
    .order('user.user_metadata->last_sign_in_at', { ascending: false });

  if (error) throw error;

  // Flatten response
  const result = users
    .filter(tm => tm.user)
    .map(tm => ({
      id: tm.user.id,
      email: tm.user.email,
      name: tm.user.user_metadata?.full_name || tm.user.email,
      status: tm.user.user_metadata?.status || 'active',
      lastSignIn: tm.user.user_metadata?.last_sign_in_at,
      roleAssignments: (tm.user.role_assignments || []).filter(ra => ra.role)
    }));

  return {
    success: true,
    data: result,
    count: result.length
  };
});

/**
 * POST /api/admin/users
 * Create a new user (admin only)
 */
export const createUser = asyncHandler(async (req, context) => {
  // Check permission
  await requirePermission(context, 'user', 'create');

  const { email, name } = req.body;

  // Validate input
  if (!email || !name) {
    return { success: false, error: 'Email and name are required' };
  }

  // Create user in Supabase Auth
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email,
    password: Math.random().toString(36).slice(-12), // Random temp password
    user_metadata: {
      full_name: name,
      status: 'active'
    }
  });

  if (authError) {
    return { success: false, error: authError.message };
  }

  // Log audit
  await supabase.from('audit_log').insert({
    action: 'create',
    resource: 'user',
    entity_id: authUser.user.id,
    user_id: context.user.id,
    description: `Created user: ${email}`,
    status: 'success'
  });

  return {
    success: true,
    data: {
      id: authUser.user.id,
      email: authUser.user.email,
      name: name,
      status: 'active'
    }
  };
});

/**
 * PATCH /api/admin/users/:id
 * Update user
 */
export const updateUser = asyncHandler(async (req, context) => {
  // Check permission
  await requirePermission(context, 'user', 'write');

  const { id } = req.params;
  const { name, status } = req.body;

  const updates = {
    user_metadata: {
      full_name: name,
      status: status
    }
  };

  // Update in Supabase Auth
  const { data: authUser, error: authError } = await supabase.auth.admin.updateUserById(
    id,
    updates
  );

  if (authError) {
    return { success: false, error: authError.message };
  }

  // Log audit
  await supabase.from('audit_log').insert({
    action: 'update',
    resource: 'user',
    entity_id: id,
    user_id: context.user.id,
    description: `Updated user: ${id}`,
    changes: { name, status },
    status: 'success'
  });

  return {
    success: true,
    data: {
      id: authUser.user.id,
      email: authUser.user.email,
      name: authUser.user.user_metadata?.full_name,
      status: authUser.user.user_metadata?.status
    }
  };
});

// ============================================================================
// ROLE ASSIGNMENT ENDPOINTS
// ============================================================================

/**
 * POST /api/admin/role-assignments
 * Assign a role to a user in a team
 */
export const assignRole = asyncHandler(async (req, context) => {
  // Check permission
  await requirePermission(context, 'role', 'assign');

  const { userId, teamId, roleId } = req.body;

  // Validate input
  if (!userId || !teamId || !roleId) {
    return { success: false, error: 'User, team, and role are required' };
  }

  // Check if assignment already exists
  const { data: existing } = await supabase
    .from('role_assignment')
    .select('id')
    .eq('user_id', userId)
    .eq('team_id', teamId)
    .eq('role_id', roleId)
    .single();

  if (existing) {
    return { success: false, error: 'Role already assigned' };
  }

  // Create assignment
  const { data: assignment, error } = await supabase
    .from('role_assignment')
    .insert({
      user_id: userId,
      team_id: teamId,
      role_id: roleId,
      assigned_by: context.user.id,
      assigned_at: new Date().toISOString()
    })
    .select('*, role:role_id(id, name), team:team_id(id, name)')
    .single();

  if (error) throw error;

  // Log audit
  await supabase.from('audit_log').insert({
    action: 'create',
    resource: 'role_assignment',
    entity_id: assignment.id,
    user_id: context.user.id,
    description: `Assigned ${assignment.role.name} to user ${userId} in team ${assignment.team.name}`,
    status: 'success'
  });

  return {
    success: true,
    data: {
      id: assignment.id,
      userId,
      teamId,
      roleId,
      role: assignment.role,
      team: assignment.team
    }
  };
});

/**
 * DELETE /api/admin/role-assignments/:id
 * Revoke a role assignment
 */
export const revokeRole = asyncHandler(async (req, context) => {
  // Check permission
  await requirePermission(context, 'role', 'revoke');

  const { id } = req.params;

  // Get assignment details for logging
  const { data: assignment } = await supabase
    .from('role_assignment')
    .select('*, role:role_id(id, name), user_id, team_id')
    .eq('id', id)
    .single();

  if (!assignment) {
    return { success: false, error: 'Assignment not found' };
  }

  // Delete assignment
  const { error } = await supabase
    .from('role_assignment')
    .delete()
    .eq('id', id);

  if (error) throw error;

  // Log audit
  await supabase.from('audit_log').insert({
    action: 'delete',
    resource: 'role_assignment',
    entity_id: id,
    user_id: context.user.id,
    description: `Revoked ${assignment.role.name} from user ${assignment.user_id}`,
    status: 'success'
  });

  return {
    success: true,
    data: { id }
  };
});

// ============================================================================
// AUDIT LOG ENDPOINTS
// ============================================================================

/**
 * GET /api/admin/audit-logs
 * List audit logs with filtering
 */
export const listAuditLogs = asyncHandler(async (req, context) => {
  // Check permission
  await requirePermission(context, 'audit', 'read');

  const { action, resource, startDate, endDate, limit = 500, offset = 0 } = req.query;
  const teamId = context.teams.primaryTeam.id;

  let query = supabase
    .from('audit_log')
    .select('*', { count: 'exact' })
    .eq('team_id', teamId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (action) query = query.eq('action', action);
  if (resource) query = query.eq('resource', resource);
  if (startDate) query = query.gte('created_at', startDate);
  if (endDate) query = query.lte('created_at', endDate);

  const { data: logs, count, error } = await query;

  if (error) throw error;

  return {
    success: true,
    data: logs,
    count,
    offset,
    limit
  };
});

/**
 * GET /api/admin/audit-logs/:id
 * Get single audit log with details
 */
export const getAuditLog = asyncHandler(async (req, context) => {
  // Check permission
  await requirePermission(context, 'audit', 'read');

  const { id } = req.params;
  const teamId = context.teams.primaryTeam.id;

  const { data: log, error } = await supabase
    .from('audit_log')
    .select('*')
    .eq('id', id)
    .eq('team_id', teamId)
    .single();

  if (error) {
    return { success: false, error: 'Audit log not found' };
  }

  return {
    success: true,
    data: log
  };
});

// ============================================================================
// SETTINGS ENDPOINTS
// ============================================================================

/**
 * GET /api/admin/settings
 * Get all system settings
 */
export const getSettings = asyncHandler(async (req, context) => {
  // Check permission
  await requirePermission(context, 'settings', 'read');

  const teamId = context.teams.primaryTeam.id;

  const { data: settings, error } = await supabase
    .from('system_settings')
    .select('*')
    .eq('team_id', teamId)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
    throw error;
  }

  return {
    success: true,
    data: settings || {}
  };
});

/**
 * PATCH /api/admin/settings/general
 * Update general settings
 */
export const updateGeneralSettings = asyncHandler(async (req, context) => {
  // Check permission
  await requirePermission(context, 'settings', 'manage');

  const { companyName, companyCode, defaultTimezone, defaultCurrency } = req.body;
  const teamId = context.teams.primaryTeam.id;

  const { data: settings, error } = await supabase
    .from('system_settings')
    .upsert({
      team_id: teamId,
      company_name: companyName,
      company_code: companyCode,
      default_timezone: defaultTimezone,
      default_currency: defaultCurrency,
      updated_at: new Date().toISOString()
    }, { onConflict: 'team_id' })
    .select()
    .single();

  if (error) throw error;

  // Log audit
  await supabase.from('audit_log').insert({
    action: 'update',
    resource: 'settings',
    entity_id: settings.id,
    user_id: context.user.id,
    description: 'Updated general settings',
    changes: { companyName, companyCode, defaultTimezone, defaultCurrency },
    status: 'success'
  });

  return {
    success: true,
    data: settings
  };
});

/**
 * PATCH /api/admin/settings/tms
 * Update TMS integration settings
 */
export const updateTmsSettings = asyncHandler(async (req, context) => {
  // Check permission
  await requirePermission(context, 'settings', 'manage');

  const { tmsType, tmsUrl, tmsApiKey, tmsUsername, autoSync } = req.body;
  const teamId = context.teams.primaryTeam.id;

  const updates = {
    team_id: teamId,
    tms_type: tmsType,
    tms_url: tmsUrl,
    tms_username: tmsUsername,
    auto_sync: autoSync,
    updated_at: new Date().toISOString()
  };

  // Only update API key if provided
  if (tmsApiKey) {
    updates.tms_api_key = tmsApiKey; // In production, encrypt this
  }

  const { data: settings, error } = await supabase
    .from('system_settings')
    .upsert(updates, { onConflict: 'team_id' })
    .select()
    .single();

  if (error) throw error;

  // Log audit (don't log API key)
  await supabase.from('audit_log').insert({
    action: 'update',
    resource: 'settings',
    entity_id: settings.id,
    user_id: context.user.id,
    description: 'Updated TMS integration settings',
    changes: { tmsType, tmsUrl, tmsUsername, autoSync },
    status: 'success'
  });

  return {
    success: true,
    data: {
      ...settings,
      tms_api_key: undefined // Don't return API key
    }
  };
});

/**
 * PATCH /api/admin/settings/email
 * Update email configuration
 */
export const updateEmailSettings = asyncHandler(async (req, context) => {
  // Check permission
  await requirePermission(context, 'settings', 'manage');

  const { smtpHost, smtpPort, smtpUser, smtpPassword, fromEmail, fromName } = req.body;
  const teamId = context.teams.primaryTeam.id;

  const updates = {
    team_id: teamId,
    smtp_host: smtpHost,
    smtp_port: smtpPort,
    smtp_user: smtpUser,
    from_email: fromEmail,
    from_name: fromName,
    updated_at: new Date().toISOString()
  };

  // Only update password if provided
  if (smtpPassword) {
    updates.smtp_password = smtpPassword; // In production, encrypt this
  }

  const { data: settings, error } = await supabase
    .from('system_settings')
    .upsert(updates, { onConflict: 'team_id' })
    .select()
    .single();

  if (error) throw error;

  // Log audit (don't log password)
  await supabase.from('audit_log').insert({
    action: 'update',
    resource: 'settings',
    entity_id: settings.id,
    user_id: context.user.id,
    description: 'Updated email configuration',
    changes: { smtpHost, smtpPort, smtpUser, fromEmail, fromName },
    status: 'success'
  });

  return {
    success: true,
    data: {
      ...settings,
      smtp_password: undefined // Don't return password
    }
  };
});

// ============================================================================
// API KEY ENDPOINTS
// ============================================================================

/**
 * POST /api/admin/settings/api-keys
 * Generate a new API key
 */
export const createApiKey = asyncHandler(async (req, context) => {
  // Check permission
  await requirePermission(context, 'settings', 'manage');

  const { name } = req.body;
  const teamId = context.teams.primaryTeam.id;

  if (!name) {
    return { success: false, error: 'Key name is required' };
  }

  // Generate random key
  const key = 'key_' + Math.random().toString(36).slice(-32);

  const { data: apiKey, error } = await supabase
    .from('api_key')
    .insert({
      team_id: teamId,
      name,
      key_hash: key, // In production, hash this
      created_by: context.user.id,
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw error;

  // Log audit
  await supabase.from('audit_log').insert({
    action: 'create',
    resource: 'api_key',
    entity_id: apiKey.id,
    user_id: context.user.id,
    description: `Generated API key: ${name}`,
    status: 'success'
  });

  return {
    success: true,
    data: {
      id: apiKey.id,
      name: apiKey.name,
      value: key, // Only return once
      createdAt: apiKey.created_at
    }
  };
});

/**
 * DELETE /api/admin/settings/api-keys/:id
 * Revoke an API key
 */
export const revokeApiKey = asyncHandler(async (req, context) => {
  // Check permission
  await requirePermission(context, 'settings', 'manage');

  const { id } = req.params;

  // Mark as revoked instead of deleting
  const { error } = await supabase
    .from('api_key')
    .update({
      revoked_at: new Date().toISOString(),
      revoked_by: context.user.id
    })
    .eq('id', id);

  if (error) throw error;

  // Log audit
  await supabase.from('audit_log').insert({
    action: 'delete',
    resource: 'api_key',
    entity_id: id,
    user_id: context.user.id,
    description: 'Revoked API key',
    status: 'success'
  });

  return {
    success: true,
    data: { id }
  };
});

// ============================================================================
// EXPORT ALL HANDLERS
// ============================================================================

export default {
  // Users
  listUsers,
  createUser,
  updateUser,
  // Roles
  assignRole,
  revokeRole,
  // Audit
  listAuditLogs,
  getAuditLog,
  // Settings
  getSettings,
  updateGeneralSettings,
  updateTmsSettings,
  updateEmailSettings,
  createApiKey,
  revokeApiKey
};

// ============================================================================
// END OF admin-api-handlers.js
// ============================================================================
