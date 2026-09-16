import { createClient } from '@supabase/supabase-js';
import { asyncHandler, buildRequestContext, successResponse, errorResponse } from './api-middleware.js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_KEY
);

export const handleListTasks = asyncHandler(async (req, event, context) => {
  const { userId, teamId } = context;
  const queryParams = event.queryStringParameters || {};
  const status = queryParams.status || 'all';
  const assigned = queryParams.assigned || 'all';
  const limit = parseInt(queryParams.limit) || 20;
  const offset = parseInt(queryParams.offset) || 0;

  try {
    let query = supabase
      .from('task')
      .select('*', { count: 'exact' })
      .is('deleted_at', null)
      .order('due_date', { ascending: true })
      .range(offset, offset + limit - 1);

    if (assigned === 'me') {
      query = query.eq('assigned_to', userId);
    }

    if (status !== 'all') {
      query = query.eq('status', status);
    } else {
      query = query.neq('status', 'archived');
    }

    const { data, count, error } = await query;
    if (error) throw error;

    // Count overdue & due soon
    const now = new Date();
    const soonDate = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    const overdue = data.filter(t => 
      new Date(t.due_date) < now && t.status !== 'completed'
    ).length;
    
    const dueSoon = data.filter(t => 
      new Date(t.due_date) > now && new Date(t.due_date) < soonDate && t.status !== 'completed'
    ).length;

    return successResponse({
      data,
      total: count || 0,
      overdue,
      dueSoon,
      limit,
      offset
    });
  } catch (error) {
    console.error('List tasks error:', error);
    return errorResponse('Failed to fetch tasks', 500);
  }
});

export const handleGetTask = asyncHandler(async (req, event, context) => {
  const { id } = event.pathParameters;

  try {
    const { data, error } = await supabase
      .from('task')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error || !data) return errorResponse('Task not found', 404);
    return successResponse(data);
  } catch (error) {
    console.error('Get task error:', error);
    return errorResponse('Failed to fetch task', 500);
  }
});

export const handleCreateTask = asyncHandler(async (req, event, context) => {
  const { userId, teamId } = context;

  try {
    const body = JSON.parse(event.body);
    const { title, description, priority = 'medium', dueDate, assignedTo, relatedJob, relatedQuote } = body;

    if (!title || !dueDate) {
      return errorResponse('Missing required fields: title, dueDate', 400);
    }

    const { data, error } = await supabase
      .from('task')
      .insert([{
        team_id: teamId,
        title,
        description: description || '',
        priority,
        due_date: dueDate,
        assigned_to: assignedTo || userId,
        created_by: userId,
        job_id: relatedJob || null,
        quote_id: relatedQuote || null,
        status: 'open'
      }])
      .select()
      .single();

    if (error) throw error;
    return successResponse({ 
      id: data.id, 
      title: data.title, 
      status: 'open' 
    }, 201);
  } catch (error) {
    console.error('Create task error:', error);
    return errorResponse(error.message || 'Failed to create task', 500);
  }
});

export const handleUpdateTask = asyncHandler(async (req, event, context) => {
  const { id } = event.pathParameters;

  try {
    const body = JSON.parse(event.body);

    const { data, error } = await supabase
      .from('task')
      .update({
        ...body,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return successResponse(data);
  } catch (error) {
    console.error('Update task error:', error);
    return errorResponse('Failed to update task', 500);
  }
});

export const handleDeleteTask = asyncHandler(async (req, event, context) => {
  const { id } = event.pathParameters;

  try {
    const { error } = await supabase
      .from('task')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
    return successResponse({ deleted: true });
  } catch (error) {
    console.error('Delete task error:', error);
    return errorResponse('Failed to delete task', 500);
  }
});

export const handler = asyncHandler(async (event, context) => {
  const requestContext = await buildRequestContext(event, context);
  const { method, path } = event.requestContext.http;
  const { id } = event.pathParameters || {};

  if (method === 'GET' && !id) return await handleListTasks(event, event, requestContext);
  if (method === 'GET' && id) return await handleGetTask(event, event, requestContext);
  if (method === 'POST' && !id) return await handleCreateTask(event, event, requestContext);
  if (method === 'PUT' && id) return await handleUpdateTask(event, event, requestContext);
  if (method === 'DELETE' && id) return await handleDeleteTask(event, event, requestContext);

  return errorResponse('Not found', 404);
});
