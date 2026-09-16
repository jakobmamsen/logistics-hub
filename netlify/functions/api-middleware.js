import { supabase } from '../supabase.js';

export const asyncHandler = (fn) => async (req, context) => {
  try {
    return await fn(req, context);
  } catch (error) {
    console.error('Handler error:', error);
    return errorResponse(error.message || 'Internal Server Error', error.status || 500);
  }
};

export const buildRequestContext = async (req) => {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.split(' ')[1];
  
  if (!token) {
    return { user: null, session: null };
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    return { user, session: user ? { user } : null };
  } catch (err) {
    return { user: null, session: null };
  }
};

export const requirePermission = (requiredPermission) => async (req, context) => {
  const { user } = await buildRequestContext(req);
  if (!user) throw new AuthorizationError('Unauthorized');
  return { user };
};

export const requireRole = (requiredRole) => async (req, context) => {
  const { user } = await buildRequestContext(req);
  if (!user) throw new AuthorizationError('Unauthorized');
  
  const { data: roleData } = await supabase
    .from('role_assignment')
    .select('role')
    .eq('user_id', user.id)
    .single();
  
  if (!roleData || roleData.role !== requiredRole) {
    throw new AuthorizationError(`Role ${requiredRole} required`);
  }
  
  return { user, role: roleData.role };
};

export const successResponse = (data, status = 200) => ({
  statusCode: status,
  body: JSON.stringify({ success: true, data }),
  headers: { 'Content-Type': 'application/json' },
});

export const createdResponse = (data) => successResponse(data, 201);

export const errorResponse = (message, status = 400) => ({
  statusCode: status,
  body: JSON.stringify({ success: false, error: message }),
  headers: { 'Content-Type': 'application/json' },
});

export const logRequest = (req, context) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
};

export class AuthorizationError extends Error {
  constructor(message) {
    super(message);
    this.status = 403;
  }
}

export class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.status = 400;
  }
}

export class NotFoundError extends Error {
  constructor(message) {
    super(message);
    this.status = 404;
  }
}

export default {
  asyncHandler,
  buildRequestContext,
  requirePermission,
  requireRole,
  successResponse,
  createdResponse,
  errorResponse,
  logRequest,
  AuthorizationError,
  ValidationError,
  NotFoundError,
};
