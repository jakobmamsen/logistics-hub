import { createClient } from '@supabase/supabase-js';
import { asyncHandler, buildRequestContext, successResponse, errorResponse } from './api-middleware.js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_KEY
);

export const handleListPreAlerts = asyncHandler(async (req, event, context) => {
  const { teamId } = context;
  const queryParams = event.queryStringParameters || {};
  const status = queryParams.status || 'all';
  const limit = parseInt(queryParams.limit) || 20;
  const offset = parseInt(queryParams.offset) || 0;

  try {
    let query = supabase
      .from('pre_alert')
      .select('id, alert_number, vessel_name, destination_port, eta_date, status, job_id, created_at', { count: 'exact' })
      .eq('team_id', teamId)
      .is('deleted_at', null)
      .order('eta_date', { ascending: true })
      .range(offset, offset + limit - 1);

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, count, error } = await query;
    if (error) throw error;

    const pending = data.filter(p => p.status === 'pending').length;

    return successResponse({
      data: data.map(p => ({
        ...p,
        port: p.destination_port,
        eta: p.eta_date
      })),
      total: count || 0,
      pending,
      limit,
      offset
    });
  } catch (error) {
    console.error('List pre-alerts error:', error);
    return errorResponse('Failed to fetch pre-alerts', 500);
  }
});

export const handleGetPreAlert = asyncHandler(async (req, event, context) => {
  const { teamId } = context;
  const { id } = event.pathParameters;

  try {
    const { data: preAlert, error: alertError } = await supabase
      .from('pre_alert')
      .select('*')
      .eq('id', id)
      .eq('team_id', teamId)
      .is('deleted_at', null)
      .single();

    if (alertError || !preAlert) return errorResponse('Pre-alert not found', 404);

    // Get job details if related
    let jobDetails = null;
    if (preAlert.job_id) {
      const { data: job } = await supabase
        .from('job')
        .select('id, job_number, quote_id')
        .eq('id', preAlert.job_id)
        .single();
      
      if (job) {
        const { data: quote } = await supabase
          .from('quote')
          .select('client_id, origin_port, destination_port')
          .eq('id', job.quote_id)
          .single();
        jobDetails = { ...job, quote };
      }
    }

    // Get checklist
    const { data: checklist } = await supabase
      .from('pre_alert_checklist')
      .select('*')
      .eq('pre_alert_id', id);

    return successResponse({
      ...preAlert,
      job: jobDetails,
      checklist: checklist || []
    });
  } catch (error) {
    console.error('Get pre-alert error:', error);
    return errorResponse('Failed to fetch pre-alert', 500);
  }
});

export const handleUpdatePreAlert = asyncHandler(async (req, event, context) => {
  const { teamId } = context;
  const { id } = event.pathParameters;

  try {
    const body = JSON.parse(event.body);
    const { status, checklist } = body;

    // Update status if provided
    if (status) {
      await supabase
        .from('pre_alert')
        .update({ 
          status, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', id)
        .eq('team_id', teamId);
    }

    // Update checklist items if provided
    if (checklist && checklist.length > 0) {
      for (const item of checklist) {
        if (item.completed) {
          await supabase
            .from('pre_alert_checklist')
            .update({ 
              completed: true, 
              completed_at: new Date().toISOString() 
            })
            .eq('id', item.id);
        }
      }
    }

    // Return updated pre-alert
    const { data } = await supabase
      .from('pre_alert')
      .select('*')
      .eq('id', id)
      .single();

    return successResponse(data);
  } catch (error) {
    console.error('Update pre-alert error:', error);
    return errorResponse('Failed to update pre-alert', 500);
  }
});

export const handleSendPreAlert = asyncHandler(async (req, event, context) => {
  const { teamId, userId } = context;
  const { id } = event.pathParameters;

  try {
    const body = JSON.parse(event.body);
    const { recipientEmail } = body;

    if (!recipientEmail) {
      return errorResponse('Missing required field: recipientEmail', 400);
    }

    // Get pre-alert with job and checklist
    const { data: preAlert } = await supabase
      .from('pre_alert')
      .select('*, pre_alert_checklist(*)')
      .eq('id', id)
      .eq('team_id', teamId)
      .single();

    if (!preAlert) return errorResponse('Pre-alert not found', 404);

    // TODO: In Release 1.1, integrate SendGrid here to send actual email
    // For now, just mark as sent in the system

    // Update pre-alert status
    const { error } = await supabase
      .from('pre_alert')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        sent_to: recipientEmail,
        sent_by: userId
      })
      .eq('id', id);

    if (error) throw error;

    return successResponse({ 
      sent: true, 
      sentAt: new Date().toISOString(), 
      messageId: `msg-${Date.now()}`,
      note: 'Email integration available in Release 1.1 (SendGrid)'
    });
  } catch (error) {
    console.error('Send pre-alert error:', error);
    return errorResponse('Failed to send pre-alert', 500);
  }
});

export const handler = asyncHandler(async (event, context) => {
  const requestContext = await buildRequestContext(event, context);
  const { method, path } = event.requestContext.http;
  const { id } = event.pathParameters || {};

  if (method === 'GET' && !id) return await handleListPreAlerts(event, event, requestContext);
  if (method === 'GET' && id && !path.includes('/')) return await handleGetPreAlert(event, event, requestContext);
  if (method === 'PUT' && id && !path.includes('/send')) return await handleUpdatePreAlert(event, event, requestContext);
  if (method === 'POST' && path.includes('/send')) return await handleSendPreAlert(event, event, requestContext);

  return errorResponse('Not found', 404);
});
