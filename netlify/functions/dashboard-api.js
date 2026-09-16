import { createClient } from '@supabase/supabase-js';
import { asyncHandler, buildRequestContext, successResponse, errorResponse } from './api-middleware.js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_KEY
);

function formatTimeAgo(timestamp) {
  const now = new Date();
  const then = new Date(timestamp);
  const secondsAgo = Math.floor((now - then) / 1000);

  if (secondsAgo < 60) return 'just now';
  if (secondsAgo < 3600) return `${Math.floor(secondsAgo / 60)}m ago`;
  if (secondsAgo < 86400) return `${Math.floor(secondsAgo / 3600)}h ago`;
  if (secondsAgo < 604800) return `${Math.floor(secondsAgo / 86400)}d ago`;
  return then.toLocaleDateString();
}

export const handleMetrics = asyncHandler(async (req, event, context) => {
  const { userId, teamId } = context;

  try {
    // Count active quotes (status = 'sent')
    const { count: activeQuotes, error: e1 } = await supabase
      .from('quote')
      .select('*', { count: 'exact', head: true })
      .eq('team_id', teamId)
      .eq('status', 'sent');

    // Count pending jobs
    const { count: pendingJobs, error: e2 } = await supabase
      .from('job')
      .select('*', { count: 'exact', head: true })
      .eq('team_id', teamId)
      .eq('status', 'pending');

    // Count my tasks (open, not completed)
    const { count: myTasks, error: e3 } = await supabase
      .from('task')
      .select('*', { count: 'exact', head: true })
      .eq('assigned_to', userId)
      .neq('status', 'completed');

    // Count pre-alerts (pending)
    const { count: preAlerts, error: e4 } = await supabase
      .from('pre_alert')
      .select('*', { count: 'exact', head: true })
      .eq('team_id', teamId)
      .eq('status', 'pending');

    if (e1 || e2 || e3 || e4) throw new Error('Failed to fetch metrics');

    // Week activity
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { count: weekQuotes } = await supabase
      .from('quote')
      .select('*', { count: 'exact', head: true })
      .eq('team_id', teamId)
      .gte('created_at', oneWeekAgo);

    const { count: weekJobs } = await supabase
      .from('job')
      .select('*', { count: 'exact', head: true })
      .eq('team_id', teamId)
      .gte('created_at', oneWeekAgo);

    const { count: weekTasks } = await supabase
      .from('task')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', oneWeekAgo);

    return successResponse({
      activeQuotes: activeQuotes || 0,
      pendingJobs: pendingJobs || 0,
      myTasks: myTasks || 0,
      preAlerts: preAlerts || 0,
      weekActivity: {
        quotes: weekQuotes || 0,
        jobs: weekJobs || 0,
        tasks: weekTasks || 0
      }
    });
  } catch (error) {
    console.error('Metrics error:', error);
    return errorResponse('Failed to fetch metrics', 500);
  }
});

export const handleActivity = asyncHandler(async (req, event, context) => {
  const { teamId } = context;
  const limit = 10;

  try {
    // Recent quotes
    const { data: recentQuotes } = await supabase
      .from('quote')
      .select('id, quote_number, status, created_at')
      .eq('team_id', teamId)
      .order('created_at', { ascending: false })
      .limit(limit / 2);

    // Recent jobs
    const { data: recentJobs } = await supabase
      .from('job')
      .select('id, job_number, status, created_at')
      .eq('team_id', teamId)
      .order('created_at', { ascending: false })
      .limit(limit / 2);

    const activity = [
      ...(recentQuotes || []).map(q => ({
        id: q.id,
        type: 'quote',
        title: `Quote ${q.quote_number}`,
        action: q.status === 'sent' ? 'Submitted' : q.status === 'accepted' ? 'Approved' : 'Created',
        timestamp: q.created_at
      })),
      ...(recentJobs || []).map(j => ({
        id: j.id,
        type: 'job',
        title: `Job ${j.job_number}`,
        action: 'Created',
        timestamp: j.created_at
      }))
    ]
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit)
      .map(item => ({
        ...item,
        timestamp: formatTimeAgo(item.timestamp)
      }));

    return successResponse(activity);
  } catch (error) {
    console.error('Activity error:', error);
    return errorResponse('Failed to fetch activity', 500);
  }
});

export const handler = asyncHandler(async (event, context) => {
  const requestContext = await buildRequestContext(event, context);
  const { method, path } = event.requestContext.http;

  if (method === 'GET' && path.includes('/metrics')) {
    return await handleMetrics(event, event, requestContext);
  }

  if (method === 'GET' && path.includes('/activity')) {
    return await handleActivity(event, event, requestContext);
  }

  return errorResponse('Not found', 404);
});
