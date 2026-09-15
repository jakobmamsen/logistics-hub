// ============================================================================
// LOGISTICS HUB RELEASE 1 — API MIDDLEWARE
// ============================================================================
// File: api-middleware.js
// Purpose: Authentication, authorization, error handling, and logging
// Dependencies: Supabase client, Node.js standard libraries
// Status: Production-ready for Release 1
//
// Middleware layers:
// 1. verifyAuth() - Validates JWT token from Authorization header
// 2. requireRole() - Enforces role-based access control
// 3. requirePermission() - Checks specific resource/action permissions
// 4. logRequest() - Logs all API calls for audit trail
// 5. errorHandler() - Centralized error response handling
// 6. asyncHandler() - Wrapper for async route handlers
//
// ============================================================================

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Initialize Supabase client with service role (for admin operations)
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ============================================================================
// ERROR CLASSES
// ============================================================================

export class ApiError extends Error {
  constructor(message, statusCode = 400, details = null) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

export class AuthenticationError extends ApiError {
  constructor(message = 'Authentication failed') {
    super(message, 401);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends ApiError {
  constructor(message = 'Insufficient permissions') {
    super(message, 403);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends ApiError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends ApiError {
  constructor(message, details = null) {
    super(message, 422, details);
    this.name = 'ValidationError';
  }
}

// ============================================================================
// 1. AUTHENTICATION MIDDLEWARE
// ============================================================================
// Verifies JWT token and extracts user from Authorization header

export async function verifyAuth(req) {
  const authHeader = req.headers.get('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AuthenticationError('Missing or invalid Authorization header');
  }
  
  const token = authHeader.slice(7); // Remove "Bearer " prefix
  
  try {
    // Verify token using Supabase
    const { data, error } = await supabase.auth.getUser(token);
    
    if (error || !data.user) {
      throw new AuthenticationError('Invalid or expired token');
    }
    
    // Fetch user profile from our users table
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('id, email, name, status, timezone_id')
      .eq('id', data.user.id)
      .single();
    
    if (profileError || !userProfile) {
      throw new AuthenticationError('User profile not found');
    }
    
    if (userProfile.status === 'suspended') {
      throw new AuthenticationError('User account is suspended');
    }
    
    if (userProfile.status !== 'active') {
      throw new AuthenticationError('User account is not active');
    }
    
    return {
      userId: userProfile.id,
      email: userProfile.email,
      name: userProfile.name,
      timezoneId: userProfile.timezone_id,
      supabaseUser: data.user
    };
  } catch (error) {
    if (error instanceof AuthenticationError) throw error;
    console.error('Auth verification error:', error);
    throw new AuthenticationError('Failed to verify authentication');
  }
}

// ============================================================================
// 2. TEAM SCOPING MIDDLEWARE
// ============================================================================
// Gets user's team memberships and active team

export async function getUserTeams(userId) {
  try {
    const { data, error } = await supabase
      .from('team_member')
      .select('team_id, is_primary, team:team_id(id, name, business_area, region)')
      .eq('user_id', userId);
    
    if (error) throw error;
    
    const teams = data.map(tm => ({
      id: tm.team_id,
      name: tm.team.name,
      businessArea: tm.team.business_area,
      region: tm.team.region,
      isPrimary: tm.is_primary
    }));
    
    // Find primary team
    const primaryTeam = teams.find(t => t.isPrimary) || teams[0];
    
    return {
      teams,
      primaryTeam,
      teamIds: teams.map(t => t.id)
    };
  } catch (error) {
    console.error('Error fetching user teams:', error);
    return { teams: [], primaryTeam: null, teamIds: [] };
  }
}

// ============================================================================
// 3. ROLE AND PERMISSION MIDDLEWARE
// ============================================================================
// Fetches user's roles and permissions

export async function getUserRoles(userId, teamId = null) {
  try {
    // If teamId provided, get role for that team; otherwise get global roles
    let query = supabase
      .from('role_assignment')
      .select('role_id, team_id, role:role_id(id, name)')
      .eq('user_id', userId);
    
    if (teamId) {
      // Get role for specific team OR global role
      query = query.or(`team_id.eq.${teamId},team_id.is.null`);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    return {
      assignments: data || [],
      roles: (data || []).map(ra => ra.role.name),
      isAdmin: (data || []).some(ra => ra.role.name === 'admin')
    };
  } catch (error) {
    console.error('Error fetching user roles:', error);
    return { assignments: [], roles: [], isAdmin: false };
  }
}

export async function getUserPermissions(userId, teamId = null) {
  try {
    // Get user's roles first
    const { assignments } = await getUserRoles(userId, teamId);
    
    if (!assignments || assignments.length === 0) {
      return { permissions: [], permissionMap: {} };
    }
    
    const roleIds = assignments.map(a => a.role_id);
    
    // Get permissions for those roles
    const { data, error } = await supabase
      .from('role_permission')
      .select('role_id, resource, action')
      .in('role_id', roleIds);
    
    if (error) throw error;
    
    // Build permission map: { resource: { action: true } }
    const permissionMap = {};
    (data || []).forEach(perm => {
      if (!permissionMap[perm.resource]) {
        permissionMap[perm.resource] = {};
      }
      permissionMap[perm.resource][perm.action] = true;
    });
    
    return {
      permissions: data || [],
      permissionMap
    };
  } catch (error) {
    console.error('Error fetching user permissions:', error);
    return { permissions: [], permissionMap: {} };
  }
}

// ============================================================================
// 4. AUTHORIZATION CHECKS
// ============================================================================
// Helper functions to check specific permissions

export function canUserAction(permissionMap, resource, action) {
  return permissionMap[resource]?.[action] === true;
}

export async function requirePermission(user, resource, action, teamId = null) {
  const { permissionMap } = await getUserPermissions(user.userId, teamId);
  
  if (!canUserAction(permissionMap, resource, action)) {
    throw new AuthorizationError(
      `Insufficient permissions for ${resource}:${action}`
    );
  }
}

export async function requireRole(user, requiredRole, teamId = null) {
  const { roles, isAdmin } = await getUserRoles(user.userId, teamId);
  
  if (isAdmin) return true; // Admin bypasses role checks
  
  if (!roles.includes(requiredRole)) {
    throw new AuthorizationError(
      `User does not have required role: ${requiredRole}`
    );
  }
  
  return true;
}

// ============================================================================
// 5. DATA ACCESS CONTROL
// ============================================================================
// Gets team-scoped data for RLS queries

export function getTeamFilter(teamId) {
  return { team_id: teamId };
}

export async function getTeamScopedData(user) {
  const { primaryTeam, teamIds } = await getUserTeams(user.userId);
  
  return {
    primaryTeamId: primaryTeam?.id,
    teamIds,
    teamFilter: { team_id: primaryTeam?.id }
  };
}

// ============================================================================
// 6. REQUEST LOGGING MIDDLEWARE
// ============================================================================
// Logs all API calls for audit trail

export function createAuditLog(user, resource, action, details = {}) {
  return {
    timestamp: new Date().toISOString(),
    userId: user.userId,
    userEmail: user.email,
    resource,
    action,
    details,
    userAgent: details.userAgent || null,
    ipAddress: details.ipAddress || null
  };
}

export async function logRequest(user, resource, action, details = {}) {
  // In a full implementation, persist this to an audit table
  const log = createAuditLog(user, resource, action, details);
  console.log('[AUDIT]', JSON.stringify(log));
  return log;
}

// ============================================================================
// 7. ERROR HANDLING MIDDLEWARE
// ============================================================================
// Centralized error response handling

export function formatErrorResponse(error) {
  if (error instanceof ApiError) {
    return {
      success: false,
      error: {
        message: error.message,
        code: error.name,
        status: error.statusCode,
        ...(error.details && { details: error.details })
      }
    };
  }
  
  // Unknown error
  console.error('Unexpected error:', error);
  return {
    success: false,
    error: {
      message: 'Internal server error',
      code: 'INTERNAL_ERROR',
      status: 500
    }
  };
}

export function errorResponse(statusCode, error) {
  const formatted = formatErrorResponse(error);
  return new Response(
    JSON.stringify(formatted),
    {
      status: error.statusCode || 500,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}

// ============================================================================
// 8. ASYNC HANDLER WRAPPER
// ============================================================================
// Wraps async route handlers to catch errors

export function asyncHandler(fn) {
  return async (req, context) => {
    try {
      return await fn(req, context);
    } catch (error) {
      return errorResponse(error.statusCode || 500, error);
    }
  };
}

// ============================================================================
// 9. RESPONSE HELPERS
// ============================================================================
// Standard response formatting

export function successResponse(data = null, statusCode = 200) {
  return new Response(
    JSON.stringify({
      success: true,
      data
    }),
    {
      status: statusCode,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}

export function createdResponse(data = null) {
  return successResponse(data, 201);
}

export function noContentResponse() {
  return new Response(null, {
    status: 204,
    headers: { 'Content-Type': 'application/json' }
  });
}

// ============================================================================
// 10. RATE LIMITING PLACEHOLDER
// ============================================================================
// Basic rate limiting for API protection (Phase 2: implement with Redis)

const rateLimitMap = new Map();

export function checkRateLimit(userId, limit = 100, windowMs = 60000) {
  const key = `${userId}:${Math.floor(Date.now() / windowMs)}`;
  const count = rateLimitMap.get(key) || 0;
  
  if (count >= limit) {
    throw new ApiError('Rate limit exceeded', 429);
  }
  
  rateLimitMap.set(key, count + 1);
  
  // Cleanup old entries (simple garbage collection)
  if (rateLimitMap.size > 10000) {
    const now = Date.now();
    for (const [k] of rateLimitMap) {
      const ts = parseInt(k.split(':')[1]);
      if (now - ts > windowMs * 2) {
        rateLimitMap.delete(k);
      }
    }
  }
}

// ============================================================================
// 11. REQUEST CONTEXT BUILDER
// ============================================================================
// Combines auth, teams, roles, permissions into single context object

export async function buildRequestContext(req) {
  // Get authenticated user
  const user = await verifyAuth(req);
  
  // Get user's teams
  const teams = await getUserTeams(user.userId);
  
  // Get user's roles and permissions
  const roles = await getUserRoles(user.userId);
  const permissions = await getUserPermissions(user.userId);
  
  // Build context
  return {
    user,
    teams,
    roles,
    permissions,
    
    // Helper methods
    canAction: (resource, action) => canUserAction(permissions.permissionMap, resource, action),
    isAdmin: () => roles.isAdmin,
    hasRole: (role) => roles.roles.includes(role),
    getPrimaryTeamId: () => teams.primaryTeam?.id,
    getTeamIds: () => teams.teamIds
  };
}

// ============================================================================
// EXPORT SUMMARY
// ============================================================================
// 
// Main functions to use in route handlers:
// 1. verifyAuth(req) → { userId, email, name, timezoneId }
// 2. buildRequestContext(req) → Full context with auth, teams, roles, permissions
// 3. asyncHandler(fn) → Wrapper for async route handlers
// 4. successResponse(data) → { success: true, data }
// 5. errorResponse(status, error) → { success: false, error }
// 6. requirePermission(user, resource, action) → Throws AuthorizationError if denied
// 7. requireRole(user, role) → Throws AuthorizationError if user lacks role
// 8. logRequest(user, resource, action, details) → Logs to audit trail
//
// Usage example:
//
//   export default asyncHandler(async (req, context) => {
//     const ctx = await buildRequestContext(req);
//     
//     // Check permissions
//     if (!ctx.canAction('quote', 'write')) {
//       throw new AuthorizationError('Cannot create quotes');
//     }
//     
//     // Log action
//     await logRequest(ctx.user, 'quote', 'create');
//     
//     // Process request...
//     const data = await createQuote(...);
//     
//     return createdResponse(data);
//   });
//
// ============================================================================

// ============================================================================
// END OF api-middleware.js
// ============================================================================
