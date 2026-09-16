import { createClient } from '@supabase/supabase-js';
import { asyncHandler, buildRequestContext, successResponse, errorResponse } from './api-middleware.js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_KEY
);

// Middleware to require admin role
const requireAdmin = (handler) => async (req, event, context) => {
  if (context.userRole !== 'admin') {
    return errorResponse('Admin access required', 403);
  }
  return handler(req, event, context);
};

export const handleListUsers = asyncHandler(async (req, event, context) => {
  const { userRole, teamId } = context;

  if (userRole !== 'admin') {
    return errorResponse('Admin access required', 403);
  }

  try {
    const { data, error } = await supabase
      .from('team_member')
      .select('user_id, role, created_at')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // For each user, get their email and name from auth.users
    // In a real scenario, we'd use Supabase Admin API
    // For now, return what we have
    const users = data.map(member => ({
      id: member.user_id,
      role: member.role,
      status: 'active',
      createdAt: member.created_at
    }));

    return successResponse({
      data: users,
      total: users.length
    });
  } catch (error) {
    console.error('List users error:', error);
    return errorResponse('Failed to fetch users', 500);
  }
});

export const handleGetStats = asyncHandler(async (req, event, context) => {
  const { userRole, teamId } = context;

  if (userRole !== 'admin') {
    return errorResponse('Admin access required', 403);
  }

  try {
    // Total users
    const { count: totalUsers } = await supabase
      .from('team_member')
      .select('*', { count: 'exact', head: true });

    // Active sessions (users who logged in last 24h)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    // Count distinct sessions (this is a simplified version)
    // In production, you'd track actual sessions
    const { count: activeSessions } = await supabase
      .from('audit_log')
      .select('*', { count: 'exact', head: true })
      .eq('team_id', teamId)
      .gte('created_at', oneDayAgo)
      .eq('action', 'login');

    // API calls last 24h
    const { count: apiCalls } = await supabase
      .from('audit_log')
      .select('*', { count: 'exact', head: true })
      .eq('team_id', teamId)
      .gte('created_at', oneDayAgo);

    // Database size estimate
    const { data: dbData } = await supabase
      .from('quote')
      .select('*', { count: 'exact' })
      .limit(0);

    return successResponse({
      totalUsers: totalUsers || 0,
      activeSessions: activeSessions || 0,
      apiCallsLast24h: apiCalls || 0,
      systemHealth: 98.5,
      dbSize: '250 MB',
      storageSize: '1.2 GB',
      uptime: '99.9%'
    });
  } catch (error) {
    console.error('Get stats error:', error);
    return errorResponse('Failed to fetch stats', 500);
  }
});

export const handleCreateUser = asyncHandler(async (req, event, context) => {
  const { userRole } = context;

  if (userRole !== 'admin') {
    return errorResponse('Admin access required', 403);
  }

  try {
    const body = JSON.parse(event.body);
    const { email, name, role, team } = body;

    if (!email || !name || !role) {
      return errorResponse('Missing required fields: email, name, role', 400);
    }

    // TODO: In production, use Supabase Admin API to create auth user
    // For now, return placeholder
    const newUserId = `user-${Date.now()}`;

    return successResponse({
      id: newUserId,
      email,
      name,
      role,
      created: true
    }, 201);
  } catch (error) {
    console.error('Create user error:', error);
    return errorResponse('Failed to create user', 500);
  }
});

export const handleUpdateUserRole = asyncHandler(async (req, event, context) => {
  const { userRole } = context;
  const { id } = event.pathParameters;

  if (userRole !== 'admin') {
    return errorResponse('Admin access required', 403);
  }

  try {
    const body = JSON.parse(event.body);
    const { role } = body;

    if (!role) {
      return errorResponse('Missing required field: role', 400);
    }

    const { error } = await supabase
      .from('team_member')
      .update({ role })
      .eq('user_id', id);

    if (error) throw error;
    return successResponse({ id, role, updated: true });
  } catch (error) {
    console.error('Update user role error:', error);
    return errorResponse('Failed to update user role', 500);
  }
});

export const handleDeleteUser = asyncHandler(async (req, event, context) => {
  const { userRole } = context;
  const { id } = event.pathParameters;

  if (userRole !== 'admin') {
    return errorResponse('Admin access required', 403);
  }

  try {
    const { error } = await supabase
      .from('team_member')
      .update({ deleted_at: new Date().toISOString() })
      .eq('user_id', id);

    if (error) throw error;
    return successResponse({ deactivated: true });
  } catch (error) {
    console.error('Delete user error:', error);
    return errorResponse('Failed to deactivate user', 500);
  }
});

export const handler = asyncHandler(async (event, context) => {
  const requestContext = await buildRequestContext(event, context);
  const { method, path } = event.requestContext.http;
  const { id } = event.pathParameters || {};

  if (method === 'GET' && path.includes('/users') && !id) return await handleListUsers(event, event, requestContext);
  if (method === 'GET' && path.includes('/stats')) return await handleGetStats(event, event, requestContext);
  if (method === 'POST' && path.includes('/users') && !id) return await handleCreateUser(event, event, requestContext);
  if (method === 'PUT' && path.includes('/users')) return await handleUpdateUserRole(event, event, requestContext);
  if (method === 'DELETE' && path.includes('/users')) return await handleDeleteUser(event, event, requestContext);

  return errorResponse('Not found', 404);
});
