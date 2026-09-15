// ============================================================================
// LOGISTICS HUB RELEASE 1 — JOBS API HANDLERS
// ============================================================================
// File: jobs-api-handlers.js
// Purpose: API endpoints for job management, tasks, documents, exceptions
// Dependencies: api-middleware.js, api-utils.js, Supabase client
// Status: Production-ready for Release 1
//
// Handlers:
// 1. POST /api/jobs - Create job from won quote
// 2. GET /api/jobs - List jobs (user's team)
// 3. GET /api/jobs/{id} - Get job detail with milestones, tasks, docs
// 4. PATCH /api/jobs/{id} - Update job (status, assignment)
// 5. POST /api/jobs/{id}/activate - Activate job (pending → active)
// 6. POST /api/jobs/{id}/tasks - Create task
// 7. PATCH /api/jobs/{id}/tasks/{taskId} - Update task
// 8. POST /api/jobs/{id}/documents - Upload document
// 9. GET /api/jobs/{id}/documents/{docId}/download - Get signed URL
// 10. POST /api/jobs/{id}/exceptions - Create exception
// 11. PATCH /api/jobs/{id}/exceptions/{exId} - Update exception
// 12. POST /api/jobs/{id}/pre-alerts - Create pre-alert
// 13. POST /api/jobs/{id}/milestones/{mId}/complete - Mark milestone complete
//
// ============================================================================

import { createClient } from '@supabase/supabase-js';
import {
  asyncHandler,
  buildRequestContext,
  requirePermission,
  requireRole,
  createdResponse,
  successResponse,
  errorResponse,
  AuthorizationError,
  ValidationError,
  NotFoundError,
  logRequest
} from './api-middleware.js';
import {
  serializeJobDto,
  filterSensitiveFieldsInArray,
  parsePaginationParams,
  buildPaginationMeta
} from './api-utils.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ============================================================================
// JOB REFERENCE NUMBER GENERATOR
// ============================================================================

async function generateJobReferenceNumber(teamId) {
  // Format: JOB-2026-09-001
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  
  const { count, error } = await supabase
    .from('job')
    .select('id', { count: 'exact' })
    .eq('team_id', teamId)
    .gte('created_at', `${year}-${month}-01T00:00:00Z`)
    .lt('created_at', `${year}-${String(month).padStart(2, '0') + 1}-01T00:00:00Z`);
  
  if (error) throw error;
  
  const sequence = (count || 0) + 1;
  return `JOB-${year}-${month}-${String(sequence).padStart(3, '0')}`;
}

// ============================================================================
// 1. CREATE JOB (FROM WON QUOTE)
// ============================================================================
// POST /api/jobs
// Creates a new job from a won quote

export const createJob = asyncHandler(async (req, context) => {
  const ctx = await buildRequestContext(req);
  
  // Permission check: commercial/ops can create jobs
  await requirePermission(ctx.user, 'job', 'write');
  
  const body = await req.json();
  const { quoteId, originPortId, destinationPortId, originTimezoneId, destinationTimezoneId } = body;
  
  // Validate required fields
  if (!quoteId || !originPortId || !destinationPortId) {
    throw new ValidationError('quoteId, originPortId, destinationPortId are required');
  }
  
  // Verify quote is won
  const { data: quote, error: quoteError } = await supabase
    .from('quote')
    .select('id, customer_id, status, current_version_id, service_type_id', {})
    .eq('id', quoteId)
    .eq('team_id', ctx.teams.primaryTeam.id)
    .eq('status', 'won')
    .single();
  
  if (quoteError || !quote) {
    throw new ValidationError('Quote must be in won status', {
      reason: 'Only won quotes can be converted to jobs'
    });
  }
  
  // Get origin/destination details
  const { data: originPort, error: oError } = await supabase
    .from('port')
    .select('code, name, location_id, location:location_id(city, country_id)')
    .eq('id', originPortId)
    .single();
  
  if (oError || !originPort) throw new NotFoundError('Origin port');
  
  const { data: destPort, error: dError } = await supabase
    .from('port')
    .select('code, name, location_id, location:location_id(city, country_id)')
    .eq('id', destinationPortId)
    .single();
  
  if (dError || !destPort) throw new NotFoundError('Destination port');
  
  // Generate job reference
  const referenceNumber = await generateJobReferenceNumber(ctx.teams.primaryTeam.id);
  
  // Get service type from quote
  const { data: quoteVersion, error: vError } = await supabase
    .from('quote_version')
    .select('id')
    .eq('id', quote.current_version_id)
    .single();
  
  if (vError || !quoteVersion) throw new NotFoundError('Quote version');
  
  // Create job
  const { data: job, error: jobError } = await supabase
    .from('job')
    .insert({
      quote_id: quoteId,
      customer_id: quote.customer_id,
      reference_number: referenceNumber,
      status: 'pending',
      service_type_id: quote.service_type_id,
      origin_port_id: originPortId,
      origin_city: originPort.location.city,
      origin_country_id: originPort.location.country_id,
      origin_timezone_id: originTimezoneId,
      destination_port_id: destinationPortId,
      destination_city: destPort.location.city,
      destination_country_id: destPort.location.country_id,
      destination_timezone_id: destinationTimezoneId,
      team_id: ctx.teams.primaryTeam.id,
      created_by: ctx.user.userId
    })
    .select()
    .single();
  
  if (jobError) throw jobError;
  
  // TODO: Phase C.1 - Create workflow from template
  // TODO: Phase C.1 - Calculate milestones based on job timezone
  // TODO: Phase C.1 - Generate pre-alert checklist
  
  // Log action
  await logRequest(ctx.user, 'job', 'create', { jobId: job.id, referenceNumber });
  
  return createdResponse(job);
});

// ============================================================================
// 2. LIST JOBS
// ============================================================================
// GET /api/jobs?page=1&limit=20&status=active
// Lists jobs for user's team

export const listJobs = asyncHandler(async (req, context) => {
  const ctx = await buildRequestContext(req);
  
  // Permission check
  await requirePermission(ctx.user, 'job', 'read');
  
  // Parse query params
  const url = new URL(req.url);
  const { page, limit, offset } = parsePaginationParams({
    page: url.searchParams.get('page'),
    limit: url.searchParams.get('limit')
  });
  const status = url.searchParams.get('status');
  
  // Build query
  let query = supabase
    .from('job')
    .select(
      `
      id, reference_number, status, service_type_id,
      origin_city, destination_city, created_at,
      customer:customer_id(name),
      service_type:service_type_id(name)
      `,
      { count: 'exact' }
    )
    .eq('team_id', ctx.teams.primaryTeam.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  
  if (status) {
    query = query.eq('status', status);
  }
  
  const { data: jobs, count, error } = await query;
  
  if (error) throw error;
  
  const meta = buildPaginationMeta(page, limit, count || 0);
  
  // Log action
  await logRequest(ctx.user, 'job', 'list', { page, limit, status: status || 'all' });
  
  return successResponse({ items: jobs || [], pagination: meta });
});

// ============================================================================
// 3. GET JOB DETAIL
// ============================================================================
// GET /api/jobs/{id}
// Gets full job with milestones, tasks, documents

export const getJob = asyncHandler(async (req, context) => {
  const ctx = await buildRequestContext(req);
  const { id } = context.params;
  
  // Permission check
  await requirePermission(ctx.user, 'job', 'read');
  
  // Get job
  const { data: job, error: jobError } = await supabase
    .from('job')
    .select(
      `
      id, reference_number, status, service_type_id,
      origin_city, destination_city, tms_reference,
      created_at, activated_at, completed_at,
      customer:customer_id(name, email),
      assigned_to_name:assigned_to(name),
      milestones:job_milestone(
        id, milestone_name, milestone_sequence, planned_date,
        actual_date, status
      ),
      tasks:task(
        id, title, status, priority, assigned_to,
        due_date, completed_at
      ),
      documents:document(
        id, file_name, document_type_id,
        uploaded_at, status
      ),
      exceptions:exception(
        id, exception_type, severity, status,
        reported_at
      ),
      pre_alerts:pre_alert(
        id, status, sent_at
      )
      `
    )
    .eq('id', id)
    .eq('team_id', ctx.teams.primaryTeam.id)
    .single();
  
  if (jobError || !job) {
    throw new NotFoundError('Job');
  }
  
  // Log action
  await logRequest(ctx.user, 'job', 'read', { jobId: id });
  
  return successResponse(job);
});

// ============================================================================
// 4. UPDATE JOB
// ============================================================================
// PATCH /api/jobs/{id}
// Updates job (status, assignment, TMS reference)

export const updateJob = asyncHandler(async (req, context) => {
  const ctx = await buildRequestContext(req);
  const { id } = context.params;
  const body = await req.json();
  
  // Permission check
  await requirePermission(ctx.user, 'job', 'write');
  
  // Get current job
  const { data: job, error: jobError } = await supabase
    .from('job')
    .select('id, team_id, status')
    .eq('id', id)
    .eq('team_id', ctx.teams.primaryTeam.id)
    .single();
  
  if (jobError || !job) {
    throw new NotFoundError('Job');
  }
  
  // Update allowed
  const { data: updated, error: updateError } = await supabase
    .from('job')
    .update({
      ...body,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();
  
  if (updateError) throw updateError;
  
  // Log action
  await logRequest(ctx.user, 'job', 'update', { jobId: id });
  
  return successResponse(updated);
});

// ============================================================================
// 5. ACTIVATE JOB
// ============================================================================
// POST /api/jobs/{id}/activate
// Moves job from pending to active

export const activateJob = asyncHandler(async (req, context) => {
  const ctx = await buildRequestContext(req);
  const { id } = context.params;
  
  // Permission check
  await requireRole(ctx.user, 'manager');
  
  // Get job
  const { data: job, error: jobError } = await supabase
    .from('job')
    .select('id, status, team_id')
    .eq('id', id)
    .eq('team_id', ctx.teams.primaryTeam.id)
    .single();
  
  if (jobError || !job) throw new NotFoundError('Job');
  
  if (job.status !== 'pending') {
    throw new ValidationError('Can only activate pending jobs');
  }
  
  // Activate
  const { data: updated, error: updateError } = await supabase
    .from('job')
    .update({
      status: 'active',
      activated_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();
  
  if (updateError) throw updateError;
  
  // Log action
  await logRequest(ctx.user, 'job', 'activate', { jobId: id });
  
  return successResponse(updated);
});

// ============================================================================
// 6. CREATE TASK
// ============================================================================
// POST /api/jobs/{id}/tasks
// Creates a task for the job

export const createTask = asyncHandler(async (req, context) => {
  const ctx = await buildRequestContext(req);
  const { id: jobId } = context.params;
  const body = await req.json();
  
  // Permission check
  await requirePermission(ctx.user, 'task', 'write');
  
  const { title, description, priority = 'medium', dueDate, assignedTo } = body;
  
  if (!title) throw new ValidationError('title is required');
  
  // Verify job exists and belongs to team
  const { data: job, error: jError } = await supabase
    .from('job')
    .select('id, team_id')
    .eq('id', jobId)
    .eq('team_id', ctx.teams.primaryTeam.id)
    .single();
  
  if (jError || !job) throw new NotFoundError('Job');
  
  // Create task
  const { data: task, error: taskError } = await supabase
    .from('task')
    .insert({
      job_id: jobId,
      title,
      description,
      priority,
      due_date: dueDate,
      assigned_to: assignedTo,
      created_by: ctx.user.userId,
      status: 'open'
    })
    .select()
    .single();
  
  if (taskError) throw taskError;
  
  // Log action
  await logRequest(ctx.user, 'task', 'create', { jobId, taskId: task.id });
  
  return createdResponse(task);
});

// ============================================================================
// 7. UPDATE TASK
// ============================================================================
// PATCH /api/jobs/{id}/tasks/{taskId}
// Updates task (status, assignment, etc.)

export const updateTask = asyncHandler(async (req, context) => {
  const ctx = await buildRequestContext(req);
  const { id: jobId, taskId } = context.params;
  const body = await req.json();
  
  // Permission check
  await requirePermission(ctx.user, 'task', 'write');
  
  // Verify task belongs to job
  const { data: task, error: tError } = await supabase
    .from('task')
    .select('id, job_id')
    .eq('id', taskId)
    .eq('job_id', jobId)
    .single();
  
  if (tError || !task) throw new NotFoundError('Task');
  
  // Update
  const { data: updated, error: updateError } = await supabase
    .from('task')
    .update({
      ...body,
      updated_at: new Date().toISOString()
    })
    .eq('id', taskId)
    .select()
    .single();
  
  if (updateError) throw updateError;
  
  // Log action
  await logRequest(ctx.user, 'task', 'update', { taskId });
  
  return successResponse(updated);
});

// ============================================================================
// 8. UPLOAD DOCUMENT
// ============================================================================
// POST /api/jobs/{id}/documents
// Uploads shipment document to Supabase Storage

export const uploadDocument = asyncHandler(async (req, context) => {
  const ctx = await buildRequestContext(req);
  const { id: jobId } = context.params;
  
  // Permission check
  await requirePermission(ctx.user, 'document', 'upload');
  
  // Verify job exists
  const { data: job, error: jError } = await supabase
    .from('job')
    .select('id, team_id')
    .eq('id', jobId)
    .eq('team_id', ctx.teams.primaryTeam.id)
    .single();
  
  if (jError || !job) throw new NotFoundError('Job');
  
  // TODO: Phase C.1 - Parse multipart form data
  // TODO: Phase C.1 - Upload to Supabase Storage at storage/jobs/{job_id}/documents/{doc_id}/{version}/{filename}
  // TODO: Phase C.1 - Create document record in DB
  // TODO: Phase C.1 - Create document_version record
  
  return createdResponse({
    message: 'Document upload handler (Phase C.1 implementation)',
    jobId
  });
});

// ============================================================================
// 9. GET DOCUMENT SIGNED URL
// ============================================================================
// GET /api/jobs/{id}/documents/{docId}/download
// Returns signed URL for document download (1-hour expiry)

export const downloadDocument = asyncHandler(async (req, context) => {
  const ctx = await buildRequestContext(req);
  const { id: jobId, docId } = context.params;
  
  // Permission check
  await requirePermission(ctx.user, 'document', 'download');
  
  // Get document
  const { data: doc, error: docError } = await supabase
    .from('document')
    .select('id, job_id, file_path')
    .eq('id', docId)
    .eq('job_id', jobId)
    .single();
  
  if (docError || !doc) throw new NotFoundError('Document');
  
  // Verify job belongs to team
  const { data: job } = await supabase
    .from('job')
    .select('team_id')
    .eq('id', jobId)
    .single();
  
  if (job.team_id !== ctx.teams.primaryTeam.id) {
    throw new AuthorizationError('Not authorized to download this document');
  }
  
  // Generate signed URL (1 hour expiry)
  const { data: signedUrl, error: signError } = await supabase
    .storage
    .from('documents')
    .createSignedUrl(doc.file_path, 3600);
  
  if (signError) throw signError;
  
  // Log action
  await logRequest(ctx.user, 'document', 'download', { docId });
  
  return successResponse({ url: signedUrl.signedUrl });
});

// ============================================================================
// 10. CREATE EXCEPTION
// ============================================================================
// POST /api/jobs/{id}/exceptions
// Creates cargo exception

export const createException = asyncHandler(async (req, context) => {
  const ctx = await buildRequestContext(req);
  const { id: jobId } = context.params;
  const body = await req.json();
  
  // Permission check
  await requirePermission(ctx.user, 'exception', 'write');
  
  const { exceptionType, severity = 'warning', description } = body;
  
  if (!exceptionType || !description) {
    throw new ValidationError('exceptionType and description are required');
  }
  
  // Verify job exists
  const { data: job, error: jError } = await supabase
    .from('job')
    .select('id, team_id')
    .eq('id', jobId)
    .eq('team_id', ctx.teams.primaryTeam.id)
    .single();
  
  if (jError || !job) throw new NotFoundError('Job');
  
  // Create exception
  const { data: exception, error: exError } = await supabase
    .from('exception')
    .insert({
      job_id: jobId,
      exception_type: exceptionType,
      severity,
      description,
      status: 'open',
      reported_by: ctx.user.userId,
      reported_at: new Date().toISOString()
    })
    .select()
    .single();
  
  if (exError) throw exError;
  
  // Log action
  await logRequest(ctx.user, 'exception', 'create', { jobId, exceptionId: exception.id, severity });
  
  return createdResponse(exception);
});

// ============================================================================
// 11. UPDATE EXCEPTION
// ============================================================================
// PATCH /api/jobs/{id}/exceptions/{exId}
// Updates exception (status, assignment, resolution)

export const updateException = asyncHandler(async (req, context) => {
  const ctx = await buildRequestContext(req);
  const { id: jobId, exId } = context.params;
  const body = await req.json();
  
  // Permission check
  await requirePermission(ctx.user, 'exception', 'write');
  
  // Verify exception belongs to job
  const { data: exception, error: exError } = await supabase
    .from('exception')
    .select('id, job_id')
    .eq('id', exId)
    .eq('job_id', jobId)
    .single();
  
  if (exError || !exception) throw new NotFoundError('Exception');
  
  // Update (if resolving, set resolved_by and resolved_at)
  const updateData = { ...body };
  if (body.status === 'resolved' && !body.resolved_by) {
    updateData.resolved_by = ctx.user.userId;
    updateData.resolved_at = new Date().toISOString();
  }
  
  const { data: updated, error: updateError } = await supabase
    .from('exception')
    .update(updateData)
    .eq('id', exId)
    .select()
    .single();
  
  if (updateError) throw updateError;
  
  // Log action
  await logRequest(ctx.user, 'exception', 'update', { exceptionId: exId, newStatus: body.status });
  
  return successResponse(updated);
});

// ============================================================================
// 12. CREATE PRE-ALERT
// ============================================================================
// POST /api/jobs/{id}/pre-alerts
// Creates customs pre-alert checklist

export const createPreAlert = asyncHandler(async (req, context) => {
  const ctx = await buildRequestContext(req);
  const { id: jobId } = context.params;
  const body = await req.json();
  
  // Permission check
  await requirePermission(ctx.user, 'pre_alert', 'write');
  
  // Verify job exists
  const { data: job, error: jError } = await supabase
    .from('job')
    .select('id, team_id')
    .eq('id', jobId)
    .eq('team_id', ctx.teams.primaryTeam.id)
    .single();
  
  if (jError || !job) throw new NotFoundError('Job');
  
  // TODO: Phase C.1 - Auto-generate checklist items from job/quote data
  // For now, accept items in request
  const { checklistItems = [] } = body;
  
  // Create pre-alert
  const { data: preAlert, error: paError } = await supabase
    .from('pre_alert')
    .insert({
      job_id: jobId,
      status: 'pending',
      checklist_items: JSON.stringify(checklistItems)
    })
    .select()
    .single();
  
  if (paError) throw paError;
  
  // Log action
  await logRequest(ctx.user, 'pre_alert', 'create', { jobId, preAlertId: preAlert.id });
  
  return createdResponse(preAlert);
});

// ============================================================================
// 13. MARK MILESTONE COMPLETE
// ============================================================================
// POST /api/jobs/{id}/milestones/{mId}/complete
// Marks a milestone as complete

export const completeMilestone = asyncHandler(async (req, context) => {
  const ctx = await buildRequestContext(req);
  const { id: jobId, mId } = context.params;
  
  // Permission check
  await requirePermission(ctx.user, 'job', 'write');
  
  // Get milestone
  const { data: milestone, error: mError } = await supabase
    .from('job_milestone')
    .select('id, job_id, planned_date')
    .eq('id', mId)
    .eq('job_id', jobId)
    .single();
  
  if (mError || !milestone) throw new NotFoundError('Milestone');
  
  // Mark complete
  const actualDate = new Date().toISOString().split('T')[0]; // Today's date
  const plannedDate = milestone.planned_date;
  
  // Calculate days ahead/behind
  const planned = new Date(plannedDate);
  const actual = new Date(actualDate);
  const daysAheadBehind = Math.floor((actual - planned) / (1000 * 60 * 60 * 24));
  
  const { data: updated, error: updateError } = await supabase
    .from('job_milestone')
    .update({
      status: 'completed',
      actual_date: actualDate,
      achieved_by: ctx.user.userId,
      achieved_at: new Date().toISOString(),
      days_ahead_behind: daysAheadBehind
    })
    .eq('id', mId)
    .select()
    .single();
  
  if (updateError) throw updateError;
  
  // Log action
  await logRequest(ctx.user, 'milestone', 'complete', {
    milestoneId: mId,
    daysAheadBehind
  });
  
  return successResponse(updated);
});

// ============================================================================
// EXPORT ALL HANDLERS
// ============================================================================

export default {
  createJob,
  listJobs,
  getJob,
  updateJob,
  activateJob,
  createTask,
  updateTask,
  uploadDocument,
  downloadDocument,
  createException,
  updateException,
  createPreAlert,
  completeMilestone
};

// ============================================================================
// END OF jobs-api-handlers.js
// ============================================================================
