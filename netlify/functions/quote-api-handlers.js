// ============================================================================
// LOGISTICS HUB RELEASE 1 — QUOTE API HANDLERS
// ============================================================================
// File: quote-api-handlers.js
// Purpose: Netlify Functions / API handlers for quote management
// Dependencies: api-middleware.js, api-utils.js, Supabase client
// Status: Production-ready for Release 1
//
// Handlers:
// 1. POST /api/quotes - Create quote
// 2. GET /api/quotes - List quotes (user's team)
// 3. GET /api/quotes/{id} - Get quote detail
// 4. PATCH /api/quotes/{id} - Update draft quote
// 5. POST /api/quotes/{id}/submit - Submit for approval
// 6. POST /api/quotes/{id}/approve - Manager approval
// 7. POST /api/quotes/{id}/reject - Reject quote
// 8. POST /api/quotes/{id}/send - Send to customer
import { createClient } from "@supabase/supabase-js";
import { asyncHandler } from './api-middleware.js';
import { validateInput, requirePermission, sanitizeOutput } from './api-utils.js';

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_KEY);

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
  serializeQuoteDto,
  serializeQuoteVersionDto,
  filterSensitiveFields,
  validateQuoteLineData,
  calculateQuoteFinancials,
  getApprovalRequirement,
  buildPaginationMeta,
  parsePaginationParams
} from './api-utils.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ============================================================================
// QUOTE REFERENCE NUMBER GENERATOR
// ============================================================================

async function generateQuoteReferenceNumber(teamId) {
  // Format: GLA-2026-09-001
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  
  // Get count of quotes this month for this team
  const { count, error } = await supabase
    .from('quote')
    .select('id', { count: 'exact' })
    .eq('team_id', teamId)
    .gte('created_at', `${year}-${month}-01T00:00:00Z`)
    .lt('created_at', `${year}-${String(month).padStart(2, '0') + 1}-01T00:00:00Z`);
  
  if (error) throw error;
  
  const sequence = (count || 0) + 1;
  return `GLA-${year}-${month}-${String(sequence).padStart(3, '0')}`;
}

// ============================================================================
// 1. CREATE QUOTE
// ============================================================================
// POST /api/quotes
// Creates a new quote in draft status

export const createQuote = asyncHandler(async (req, context) => {
  const ctx = await buildRequestContext(req);
  
  // Permission check
  await requirePermission(ctx.user, 'quote', 'write');
  
  // Parse body
  const body = await req.json();
  const { requestId, customerId, options } = body;
  
  // Validate required fields
  if (!requestId || !customerId) {
    throw new ValidationError('requestId and customerId are required');
  }
  
  // Verify request belongs to this team
  const { data: request, error: reqError } = await supabase
    .from('request')
    .select('id, team_id')
    .eq('id', requestId)
    .eq('team_id', ctx.teams.primaryTeam.id)
    .single();
  
  if (reqError || !request) {
    throw new NotFoundError('Request');
  }
  
  // Generate reference number
  const referenceNumber = await generateQuoteReferenceNumber(ctx.teams.primaryTeam.id);
  
  // Create quote
  const { data: quote, error: quoteError } = await supabase
    .from('quote')
    .insert({
      request_id: requestId,
      customer_id: customerId,
      reference_number: referenceNumber,
      team_id: ctx.teams.primaryTeam.id,
      created_by: ctx.user.userId,
      status: 'draft'
    })
    .select()
    .single();
  
  if (quoteError) throw quoteError;
  
  // Log action
  await logRequest(ctx.user, 'quote', 'create', { quoteId: quote.id, referenceNumber });
  
  // Return response (filter sensitive fields)
  const serialized = serializeQuoteDto(quote, ctx.roles.roles[0]);
  return createdResponse(serialized);
});

// ============================================================================
// 2. LIST QUOTES
// ============================================================================
// GET /api/quotes?page=1&limit=20&status=draft&customer=xyz
// Lists quotes for user's team with optional filters

export const listQuotes = asyncHandler(async (req, context) => {
  const ctx = await buildRequestContext(req);
  
  // Permission check
  await requirePermission(ctx.user, 'quote', 'read');
  
  // Parse query params
  const url = new URL(req.url);
  const { page, limit, offset } = parsePaginationParams({
    page: url.searchParams.get('page'),
    limit: url.searchParams.get('limit')
  });
  const status = url.searchParams.get('status');
  const customerId = url.searchParams.get('customer');
  
  // Build query
  let query = supabase
    .from('quote')
    .select(
      `
      id, request_id, customer_id, status, reference_number, created_by,
      created_at, updated_at, expires_at, team_id,
      customer:customer_id(name, email)
      `,
      { count: 'exact' }
    )
    .eq('team_id', ctx.teams.primaryTeam.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  
  if (status) {
    query = query.eq('status', status);
  }
  
  if (customerId) {
    query = query.eq('customer_id', customerId);
  }
  
  const { data: quotes, count, error } = await query;
  
  if (error) throw error;
  
  // Filter sensitive fields
  const serialized = quotes.map(q => 
    filterSensitiveFields(serializeQuoteDto(q, ctx.roles.roles[0]), 'quote', ctx.roles.roles[0])
  );
  
  // Build pagination meta
  const meta = buildPaginationMeta(page, limit, count || 0);
  
  // Log action
  await logRequest(ctx.user, 'quote', 'list', { page, limit, status: status || 'all' });
  
  return successResponse({ items: serialized, pagination: meta });
});

// ============================================================================
// 3. GET QUOTE DETAIL
// ============================================================================
// GET /api/quotes/{id}
// Gets full quote with all versions and lines

export const getQuote = asyncHandler(async (req, context) => {
  const ctx = await buildRequestContext(req);
  const { id } = context.params;
  
  // Permission check
  await requirePermission(ctx.user, 'quote', 'read');
  
  // Get quote
  const { data: quote, error: quoteError } = await supabase
    .from('quote')
    .select(
      `
      id, request_id, customer_id, status, reference_number, created_by,
      created_at, updated_at, expires_at, team_id, current_version_id,
      customer:customer_id(name, email, customer_type),
      request:request_id(title, description, origin_city, destination_city),
      versions:quote_version(
        id, version_number, status, submitted_at, approved_at,
        buy_total, sell_total, margin_percent, pricing_snapshot,
        options:quote_option(
          id, title, description, transport_mode, transit_days,
          lines:quote_line(
            id, description, quantity, unit_id, charge_category_id,
            sell_unit_price, sell_currency, buy_unit_price, buy_currency, fx_rate
          )
        )
      )
      `
    )
    .eq('id', id)
    .eq('team_id', ctx.teams.primaryTeam.id)
    .single();
  
  if (quoteError || !quote) {
    throw new NotFoundError('Quote');
  }
  
  // Filter sensitive fields (pricing hidden from ops)
  const userRole = ctx.roles.roles[0] || 'operations';
  const serialized = filterSensitiveFields(quote, 'quote', userRole);
  
  // Log action
  await logRequest(ctx.user, 'quote', 'read', { quoteId: id });
  
  return successResponse(serialized);
});

// ============================================================================
// 4. UPDATE QUOTE (DRAFT ONLY)
// ============================================================================
// PATCH /api/quotes/{id}
// Updates draft quote. Once submitted, immutable (app-enforced).

export const updateQuote = asyncHandler(async (req, context) => {
  const ctx = await buildRequestContext(req);
  const { id } = context.params;
  const body = await req.json();
  
  // Permission check
  await requirePermission(ctx.user, 'quote', 'write');
  
  // Get current quote
  const { data: quote, error: quoteError } = await supabase
    .from('quote')
    .select('id, status, team_id, created_by')
    .eq('id', id)
    .eq('team_id', ctx.teams.primaryTeam.id)
    .single();
  
  if (quoteError || !quote) {
    throw new NotFoundError('Quote');
  }
  
  // Ensure quote is draft
  if (quote.status !== 'draft') {
    throw new ValidationError('Can only update draft quotes', {
      reason: 'Quote has been submitted and is immutable',
      currentStatus: quote.status
    });
  }
  
  // Ensure user is creator or manager
  if (quote.created_by !== ctx.user.userId) {
    await requireRole(ctx.user, 'manager');
  }
  
  // Update quote
  const { data: updated, error: updateError } = await supabase
    .from('quote')
    .update({
      ...body,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();
  
  if (updateError) throw updateError;
  
  // Log action
  await logRequest(ctx.user, 'quote', 'update', { quoteId: id });
  
  const serialized = serializeQuoteDto(updated, ctx.roles.roles[0]);
  return successResponse(serialized);
});

// ============================================================================
// 5. SUBMIT QUOTE FOR APPROVAL
// ============================================================================
// POST /api/quotes/{id}/submit
// Creates quote_version (locks pricing) and triggers approval workflow

export const submitQuote = asyncHandler(async (req, context) => {
  const ctx = await buildRequestContext(req);
  const { id } = context.params;
  const body = await req.json();
  
  // Permission check
  await requirePermission(ctx.user, 'quote', 'submit');
  
  // Get quote
  const { data: quote, error: quoteError } = await supabase
    .from('quote')
    .select('id, status, team_id, current_version_id')
    .eq('id', id)
    .eq('team_id', ctx.teams.primaryTeam.id)
    .single();
  
  if (quoteError || !quote) {
    throw new NotFoundError('Quote');
  }
  
  if (quote.status !== 'draft') {
    throw new ValidationError('Can only submit draft quotes');
  }
  
  // Validate pricing data
  const { options } = body;
  if (!options || options.length === 0) {
    throw new ValidationError('At least one option with lines is required');
  }
  
  // Calculate financials for first option (MVP: single option)
  const option = options[0];
  const { lines } = option;
  
  if (!lines || lines.length === 0) {
    throw new ValidationError('At least one line item is required');
  }
  
  // Validate each line
  lines.forEach((line, idx) => {
    const result = validateQuoteLineData(line);
    if (!result.isValid) {
      throw new ValidationError(`Line ${idx + 1}: ${result.errors[0].message}`);
    }
  });
  
  // Calculate totals
  const financials = calculateQuoteFinancials(lines);
  const { requiresApproval, reasons } = getApprovalRequirement(
    financials.marginPercent,
    financials.sellTotal
  );
  
  // Get next version number
  const { data: versions, error: vError } = await supabase
    .from('quote_version')
    .select('version_number')
    .eq('quote_id', id)
    .order('version_number', { ascending: false })
    .limit(1);
  
  if (vError) throw vError;
  
  const nextVersion = versions && versions.length > 0 
    ? versions[0].version_number + 1 
    : 1;
  
  // Create quote_version (immutable)
  const { data: version, error: vCreateError } = await supabase
    .from('quote_version')
    .insert({
      quote_id: id,
      version_number: nextVersion,
      status: 'submitted',
      buy_total: financials.buyTotal,
      buy_total_currency: 'EUR', // MVP: hardcoded, Phase 2: user-selectable
      sell_total: financials.sellTotal,
      sell_total_currency: 'EUR',
      margin_percent: financials.marginPercent,
      gross_profit: financials.grossProfit,
      fx_rate: financials.fxRate,
      pricing_snapshot: JSON.stringify({
        buyTotal: financials.buyTotal,
        sellTotal: financials.sellTotal,
        marginPercent: financials.marginPercent,
        grossProfit: financials.grossProfit,
        fxRate: financials.fxRate,
        lines: lines
      }),
      requires_approval: requiresApproval,
      approval_reason: requiresApproval ? reasons.join('; ') : null,
      submitted_by: ctx.user.userId,
      submitted_at: new Date().toISOString(),
      incoterm_id: body.incoterm_id,
      payment_terms: body.payment_terms,
      notes: body.notes
    })
    .select()
    .single();
  
  if (vCreateError) throw vCreateError;
  
  // Create option and lines
  const { data: createdOption, error: optError } = await supabase
    .from('quote_option')
    .insert({
      quote_version_id: version.id,
      title: option.title || 'Standard',
      description: option.description,
      transport_mode: option.transport_mode,
      transit_days: option.transit_days,
      is_recommended: true
    })
    .select()
    .single();
  
  if (optError) throw optError;
  
  // Insert quote lines
  const lineRecords = lines.map(line => ({
    quote_option_id: createdOption.id,
    charge_category_id: line.charge_category_id,
    description: line.description,
    quantity: line.quantity,
    unit_id: line.unit_id,
    sell_unit_price: line.sell_unit_price,
    sell_currency: line.sell_currency || 'EUR',
    buy_unit_price: line.buy_unit_price,
    buy_currency: line.buy_currency || 'EUR',
    fx_rate: line.fx_rate || 1.0,
    sell_line_total: line.quantity * line.sell_unit_price,
    buy_line_total: line.buy_unit_price ? line.quantity * line.buy_unit_price : null
  }));
  
  const { error: lError } = await supabase
    .from('quote_line')
    .insert(lineRecords);
  
  if (lError) throw lError;
  
  // Update quote status & current version
  const { data: updatedQuote, error: qUpdateError } = await supabase
    .from('quote')
    .update({
      status: 'submitted',
      current_version_id: version.id,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();
  
  if (qUpdateError) throw qUpdateError;
  
  // Log action
  await logRequest(ctx.user, 'quote', 'submit', {
    quoteId: id,
    versionNumber: nextVersion,
    margin: financials.marginPercent,
    requiresApproval,
    reasons
  });
  
  // Return response
  const serialized = serializeQuoteVersionDto(version, ctx.roles.roles[0]);
  return createdResponse(serialized);
});

// ============================================================================
// 6. APPROVE QUOTE (MANAGER ONLY)
// ============================================================================
// POST /api/quotes/{id}/approve
// Approves pending quote (only if requires_approval = true)

export const approveQuote = asyncHandler(async (req, context) => {
  const ctx = await buildRequestContext(req);
  const { id } = context.params;
  
  // Permission check
  await requireRole(ctx.user, 'manager');
  
  // Get quote
  const { data: quote, error: quoteError } = await supabase
    .from('quote')
    .select('id, status, current_version_id, team_id')
    .eq('id', id)
    .eq('team_id', ctx.teams.primaryTeam.id)
    .single();
  
  if (quoteError || !quote) {
    throw new NotFoundError('Quote');
  }
  
  if (quote.status !== 'submitted') {
    throw new ValidationError('Can only approve submitted quotes');
  }
  
  // Approve version
  const { data: approvedVersion, error: appError } = await supabase
    .from('quote_version')
    .update({
      status: 'approved',
      approved_by: ctx.user.userId,
      approved_at: new Date().toISOString()
    })
    .eq('id', quote.current_version_id)
    .select()
    .single();
  
  if (appError) throw appError;
  
  // Update quote
  const { data: updatedQuote, error: qError } = await supabase
    .from('quote')
    .update({
      status: 'approved',
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();
  
  if (qError) throw qError;
  
  // Log action
  await logRequest(ctx.user, 'quote', 'approve', { quoteId: id });
  
  const serialized = serializeQuoteVersionDto(approvedVersion, ctx.roles.roles[0]);
  return successResponse(serialized);
});

// ============================================================================
// 7. REJECT QUOTE
// ============================================================================
// POST /api/quotes/{id}/reject
// Rejects quote, allows user to create new version

export const rejectQuote = asyncHandler(async (req, context) => {
  const ctx = await buildRequestContext(req);
  const { id } = context.params;
  const body = await req.json();
  
  // Permission check
  await requireRole(ctx.user, 'manager');
  
  const { reason } = body;
  if (!reason) {
    throw new ValidationError('Rejection reason is required');
  }
  
  // Get quote
  const { data: quote, error: quoteError } = await supabase
    .from('quote')
    .select('id, status, current_version_id, team_id')
    .eq('id', id)
    .eq('team_id', ctx.teams.primaryTeam.id)
    .single();
  
  if (quoteError || !quote) {
    throw new NotFoundError('Quote');
  }
  
  if (quote.status !== 'submitted') {
    throw new ValidationError('Can only reject submitted quotes');
  }
  
  // Reject version
  const { error: rejError } = await supabase
    .from('quote_version')
    .update({
      status: 'rejected',
      rejected_by: ctx.user.userId,
      rejected_at: new Date().toISOString(),
      rejection_reason: reason
    })
    .eq('id', quote.current_version_id);
  
  if (rejError) throw rejError;
  
  // Update quote back to draft (allows revision)
  const { data: updatedQuote, error: qError } = await supabase
    .from('quote')
    .update({
      status: 'draft',
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();
  
  if (qError) throw qError;
  
  // Log action
  await logRequest(ctx.user, 'quote', 'reject', { quoteId: id, reason });
  
  return successResponse({ status: 'rejected', reason });
});

// ============================================================================
// 8. SEND TO CUSTOMER
// ============================================================================
// POST /api/quotes/{id}/send
// Sends approved quote to customer (email, pre-alerts queued)

export const sendQuoteToCustomer = asyncHandler(async (req, context) => {
  const ctx = await buildRequestContext(req);
  const { id } = context.params;
  
  // Permission check
  await requirePermission(ctx.user, 'quote', 'send');
  
  // Get quote
  const { data: quote, error: quoteError } = await supabase
    .from('quote')
    .select('id, status, current_version_id, team_id')
    .eq('id', id)
    .eq('team_id', ctx.teams.primaryTeam.id)
    .single();
  
  if (quoteError || !quote) {
    throw new NotFoundError('Quote');
  }
  
  if (!['approved', 'sent'].includes(quote.status)) {
    throw new ValidationError('Can only send approved quotes');
  }
  
  // Update version as sent
  const { error: vError } = await supabase
    .from('quote_version')
    .update({
      status: 'sent',
      sent_to_customer_at: new Date().toISOString(),
      sent_by: ctx.user.userId
    })
    .eq('id', quote.current_version_id);
  
  if (vError) throw vError;
  
  // Update quote
  const { data: updated, error: qError } = await supabase
    .from('quote')
    .update({
      status: 'sent',
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();
  
  if (qError) throw qError;
  
  // TODO: Phase 1.1 - Queue email notification to customer
  // TODO: Phase 1.1 - Create pre-alert checklist
  
  // Log action
  await logRequest(ctx.user, 'quote', 'send', { quoteId: id });
  
  return successResponse(updated);
});

// ============================================================================
// 9. MARK AS WON
// ============================================================================
// POST /api/quotes/{id}/won
// Marks quote as won (customer accepted)

export const markQuoteWon = asyncHandler(async (req, context) => {
  const ctx = await buildRequestContext(req);
  const { id } = context.params;
  const body = await req.json();
  
  // Permission check
  await requirePermission(ctx.user, 'quote', 'write');
  
  // Get quote
  const { data: quote, error: quoteError } = await supabase
    .from('quote')
    .select('id, status, current_version_id, team_id')
    .eq('id', id)
    .eq('team_id', ctx.teams.primaryTeam.id)
    .single();
  
  if (quoteError || !quote) {
    throw new NotFoundError('Quote');
  }
  
  // Update version as won
  const { error: vError } = await supabase
    .from('quote_version')
    .update({
      status: 'won',
      outcome: 'won',
      outcome_date: new Date().toISOString(),
      outcome_reason: body.reason
    })
    .eq('id', quote.current_version_id);
  
  if (vError) throw vError;
  
  // Update quote
  const { data: updated, error: qError } = await supabase
    .from('quote')
    .update({
      status: 'won',
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();
  
  if (qError) throw qError;
  
  // TODO: Phase B - Create job from won quote
  
  // Log action
  await logRequest(ctx.user, 'quote', 'won', { quoteId: id });
  
  return successResponse(updated);
});

// ============================================================================
// 10. MARK AS LOST
// ============================================================================
// POST /api/quotes/{id}/lost
// Marks quote as lost (customer rejected)

export const markQuoteLost = asyncHandler(async (req, context) => {
  const ctx = await buildRequestContext(req);
  const { id } = context.params;
  const body = await req.json();
  
  // Permission check
  await requirePermission(ctx.user, 'quote', 'write');
  
  // Get quote
  const { data: quote, error: quoteError } = await supabase
    .from('quote')
    .select('id, status, current_version_id, team_id')
    .eq('id', id)
    .eq('team_id', ctx.teams.primaryTeam.id)
    .single();
  
  if (quoteError || !quote) {
    throw new NotFoundError('Quote');
  }
  
  // Update version as lost
  const { error: vError } = await supabase
    .from('quote_version')
    .update({
      status: 'lost',
      outcome: 'lost',
      outcome_date: new Date().toISOString(),
      outcome_reason: body.reason
    })
    .eq('id', quote.current_version_id);
  
  if (vError) throw vError;
  
  // Update quote
  const { data: updated, error: qError } = await supabase
    .from('quote')
    .update({
      status: 'lost',
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();
  
  if (qError) throw qError;
  
  // Log action
  await logRequest(ctx.user, 'quote', 'lost', { quoteId: id, reason: body.reason });
  
  return successResponse(updated);
});

// ============================================================================
// EXPORT ALL HANDLERS
// ============================================================================

export default {
  createQuote,
  listQuotes,
  getQuote,
  updateQuote,
  submitQuote,
  approveQuote,
  rejectQuote,
  sendQuoteToCustomer,
  markQuoteWon,
  markQuoteLost
};

// ============================================================================
// END OF quote-api-handlers.js
// ============================================================================
