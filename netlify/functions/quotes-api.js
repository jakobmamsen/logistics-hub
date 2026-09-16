import { createClient } from '@supabase/supabase-js';
import { asyncHandler, buildRequestContext, successResponse, errorResponse } from './api-middleware.js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_KEY
);

// Helper: Calculate margin percentage
function calculateMargin(totalSell, totalBuy) {
  if (totalBuy === 0) return 0;
  return ((totalSell - totalBuy) / totalBuy) * 100;
}

// Helper: Serialize quote for role-based filtering
function serializeQuoteForRole(quote, userRole) {
  if (userRole === 'operations') {
    // Operations cannot see buy prices, cost, or margin
    return {
      id: quote.id,
      quote_number: quote.quote_number,
      client_name: quote.client_id,
      origin_port: quote.origin_port,
      destination_port: quote.destination_port,
      service_type: quote.service_type,
      status: quote.status,
      created_at: quote.created_at,
      // Hide: buy prices, totals, margin
    };
  }
  // Other roles see full data
  return quote;
}

export const handleListQuotes = asyncHandler(async (req, event, context) => {
  const { teamId, userRole } = context;
  const queryParams = event.queryStringParameters || {};
  const status = queryParams.status || 'all';
  const limit = parseInt(queryParams.limit) || 20;
  const offset = parseInt(queryParams.offset) || 0;

  try {
    let query = supabase
      .from('quote')
      .select('*', { count: 'exact' })
      .eq('team_id', teamId)
      .is('deleted_at', null)
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, count, error } = await query;
    if (error) throw error;

    return successResponse({
      data: data.map(q => serializeQuoteForRole(q, userRole)),
      total: count || 0,
      limit,
      offset
    });
  } catch (error) {
    console.error('List quotes error:', error);
    return errorResponse('Failed to fetch quotes', 500);
  }
});

export const handleGetQuote = asyncHandler(async (req, event, context) => {
  const { teamId, userRole } = context;
  const { id } = event.pathParameters;

  try {
    const { data: quote, error: quoteError } = await supabase
      .from('quote')
      .select('*')
      .eq('id', id)
      .eq('team_id', teamId)
      .is('deleted_at', null)
      .single();

    if (quoteError || !quote) return errorResponse('Quote not found', 404);

    // Get quote versions
    const { data: versions } = await supabase
      .from('quote_version')
      .select('*')
      .eq('quote_id', id)
      .order('version_number', { ascending: false });

    // Get quote lines for current version
    let lines = [];
    if (versions && versions.length > 0) {
      const { data: quoteLines } = await supabase
        .from('quote_line')
        .select('*')
        .eq('quote_version_id', versions[0].id);
      lines = quoteLines || [];
    }

    const serialized = serializeQuoteForRole(quote, userRole);
    return successResponse({
      ...serialized,
      versions: versions || [],
      lines: lines || []
    });
  } catch (error) {
    console.error('Get quote error:', error);
    return errorResponse('Failed to fetch quote', 500);
  }
});

export const handleCreateQuote = asyncHandler(async (req, event, context) => {
  const { teamId, userId } = context;
  
  try {
    const body = JSON.parse(event.body);
    const { clientId, origin, destination, serviceType, incoterm, validUntil, quoteLines } = body;

    // Validate
    if (!clientId || !origin || !destination || !serviceType) {
      return errorResponse('Missing required fields: clientId, origin, destination, serviceType', 400);
    }

    // Create quote
    const { data: quote, error: createError } = await supabase
      .from('quote')
      .insert([{
        team_id: teamId,
        client_id: clientId,
        quote_number: `QT-${Date.now()}`,
        origin_port: origin,
        destination_port: destination,
        service_type: serviceType,
        incoterm: incoterm || 'CIF',
        valid_until: validUntil,
        status: 'draft',
        created_by: userId
      }])
      .select()
      .single();

    if (createError) throw createError;

    // Create version
    const { data: version } = await supabase
      .from('quote_version')
      .insert([{
        quote_id: quote.id,
        version_number: 1,
        status: 'draft'
      }])
      .select()
      .single();

    // Create lines if provided
    if (quoteLines && quoteLines.length > 0) {
      await supabase
        .from('quote_line')
        .insert(
          quoteLines.map(line => ({
            quote_id: quote.id,
            quote_version_id: version.id,
            description: line.description,
            quantity: line.qty,
            unit_sell_price: line.unitSell,
            unit_buy_price: line.unitBuy,
            currency: line.currency || 'EUR',
            line_total_sell: (line.qty * line.unitSell),
            line_total_buy: (line.qty * line.unitBuy),
            created_by: userId
          }))
        );
    }

    return successResponse({ 
      id: quote.id, 
      quoteNumber: quote.quote_number, 
      status: 'draft' 
    }, 201);
  } catch (error) {
    console.error('Create quote error:', error);
    return errorResponse(error.message || 'Failed to create quote', 500);
  }
});

export const handleUpdateQuote = asyncHandler(async (req, event, context) => {
  const { teamId, userId } = context;
  const { id } = event.pathParameters;

  try {
    const body = JSON.parse(event.body);

    // Check quote exists and is draft
    const { data: quote, error: checkError } = await supabase
      .from('quote')
      .select('status')
      .eq('id', id)
      .eq('team_id', teamId)
      .single();

    if (checkError || !quote) return errorResponse('Quote not found', 404);
    if (quote.status !== 'draft') return errorResponse('Can only update draft quotes', 400);

    // Update quote
    const { data, error } = await supabase
      .from('quote')
      .update({
        ...body,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('team_id', teamId)
      .select()
      .single();

    if (error) throw error;
    return successResponse(data);
  } catch (error) {
    console.error('Update quote error:', error);
    return errorResponse('Failed to update quote', 500);
  }
});

export const handleDeleteQuote = asyncHandler(async (req, event, context) => {
  const { teamId } = context;
  const { id } = event.pathParameters;

  try {
    const { error } = await supabase
      .from('quote')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('team_id', teamId);

    if (error) throw error;
    return successResponse({ deleted: true });
  } catch (error) {
    console.error('Delete quote error:', error);
    return errorResponse('Failed to delete quote', 500);
  }
});

export const handleSubmitQuote = asyncHandler(async (req, event, context) => {
  const { teamId, userId } = context;
  const { id } = event.pathParameters;

  try {
    // Get quote with lines
    const { data: quote, error: getError } = await supabase
      .from('quote')
      .select('*')
      .eq('id', id)
      .eq('team_id', teamId)
      .single();

    if (getError || !quote) return errorResponse('Quote not found', 404);
    if (quote.status !== 'draft') return errorResponse('Cannot submit non-draft quote', 400);

    // Get quote lines
    const { data: versions } = await supabase
      .from('quote_version')
      .select('id')
      .eq('quote_id', id)
      .eq('version_number', 1)
      .single();

    const { data: lines } = await supabase
      .from('quote_line')
      .select('line_total_sell, line_total_buy')
      .eq('quote_version_id', versions.id);

    // Calculate totals and margin
    const totalSell = lines.reduce((s, l) => s + (l.line_total_sell || 0), 0);
    const totalBuy = lines.reduce((s, l) => s + (l.line_total_buy || 0), 0);
    const margin = calculateMargin(totalSell, totalBuy);

    // Auto-approve if margin >= 15% AND value <= €10,000
    const autoApprove = margin >= 15 && totalSell <= 10000;

    // Update quote
    await supabase
      .from('quote')
      .update({
        status: autoApprove ? 'accepted' : 'sent',
        submitted_at: new Date().toISOString(),
        ...(autoApprove && { approved_by: userId, approved_at: new Date().toISOString() })
      })
      .eq('id', id);

    // Update version
    await supabase
      .from('quote_version')
      .update({
        status: autoApprove ? 'accepted' : 'sent',
        submitted_at: new Date().toISOString()
      })
      .eq('quote_id', id)
      .eq('version_number', 1);

    return successResponse({
      status: autoApprove ? 'accepted' : 'sent',
      margin: margin.toFixed(2),
      totalSell: totalSell,
      autoApproved: autoApprove,
      requiresApproval: !autoApprove
    });
  } catch (error) {
    console.error('Submit quote error:', error);
    return errorResponse('Failed to submit quote', 500);
  }
});

export const handleApproveQuote = asyncHandler(async (req, event, context) => {
  const { teamId, userId, userRole } = context;
  const { id } = event.pathParameters;

  if (userRole !== 'manager' && userRole !== 'admin') {
    return errorResponse('Only managers can approve quotes', 403);
  }

  try {
    const { error } = await supabase
      .from('quote')
      .update({
        status: 'accepted',
        approved_by: userId,
        approved_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('team_id', teamId);

    if (error) throw error;
    return successResponse({ status: 'accepted', approvedBy: userId });
  } catch (error) {
    console.error('Approve quote error:', error);
    return errorResponse('Failed to approve quote', 500);
  }
});

export const handleRejectQuote = asyncHandler(async (req, event, context) => {
  const { teamId, userId, userRole } = context;
  const { id } = event.pathParameters;

  if (userRole !== 'manager' && userRole !== 'admin') {
    return errorResponse('Only managers can reject quotes', 403);
  }

  try {
    const body = JSON.parse(event.body);
    const { reason } = body;

    const { error } = await supabase
      .from('quote')
      .update({
        status: 'rejected',
        rejected_by: userId,
        rejected_at: new Date().toISOString(),
        rejection_reason: reason || 'No reason provided'
      })
      .eq('id', id)
      .eq('team_id', teamId);

    if (error) throw error;
    return successResponse({ status: 'rejected' });
  } catch (error) {
    console.error('Reject quote error:', error);
    return errorResponse('Failed to reject quote', 500);
  }
});

export const handler = asyncHandler(async (event, context) => {
  const requestContext = await buildRequestContext(event, context);
  const { method, path } = event.requestContext.http;
  const { id } = event.pathParameters || {};

  if (method === 'GET' && !id) return await handleListQuotes(event, event, requestContext);
  if (method === 'GET' && id && !path.includes('/')) return await handleGetQuote(event, event, requestContext);
  if (method === 'POST' && !id) return await handleCreateQuote(event, event, requestContext);
  if (method === 'POST' && path.includes('/submit')) return await handleSubmitQuote(event, event, requestContext);
  if (method === 'POST' && path.includes('/approve')) return await handleApproveQuote(event, event, requestContext);
  if (method === 'POST' && path.includes('/reject')) return await handleRejectQuote(event, event, requestContext);
  if (method === 'PUT' && id) return await handleUpdateQuote(event, event, requestContext);
  if (method === 'DELETE' && id) return await handleDeleteQuote(event, event, requestContext);

  return errorResponse('Not found', 404);
});
