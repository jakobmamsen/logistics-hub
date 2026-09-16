import { createClient } from '@supabase/supabase-js';
import { asyncHandler, buildRequestContext, successResponse, errorResponse } from './api-middleware.js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_KEY
);

function formatFileSize(bytes) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIdx = 0;
  while (size >= 1024 && unitIdx < units.length - 1) {
    size /= 1024;
    unitIdx++;
  }
  return `${size.toFixed(1)} ${units[unitIdx]}`;
}

export const handleListDocuments = asyncHandler(async (req, event, context) => {
  const { teamId } = context;
  const queryParams = event.queryStringParameters || {};
  const relatedType = queryParams.relatedType || 'all';
  const limit = parseInt(queryParams.limit) || 50;
  const offset = parseInt(queryParams.offset) || 0;

  try {
    let query = supabase
      .from('document')
      .select('id, filename, document_type, created_at, file_size, created_by, job_id, quote_id')
      .eq('team_id', teamId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (relatedType !== 'all') {
      if (relatedType === 'quote') {
        query = query.not('quote_id', 'is', null);
      } else if (relatedType === 'job') {
        query = query.not('job_id', 'is', null);
      }
    }

    const { data, count, error } = await query;
    if (error) throw error;

    // Calculate total size
    const totalSize = data.reduce((sum, d) => sum + (d.file_size || 0), 0);

    return successResponse({
      data: data.map(d => ({
        id: d.id,
        filename: d.filename,
        type: d.document_type,
        uploadedAt: d.created_at,
        size: formatFileSize(d.file_size),
        sizeBytes: d.file_size,
        createdBy: d.created_by,
        relatedJob: d.job_id,
        relatedQuote: d.quote_id
      })),
      totalCount: count || 0,
      totalSize: formatFileSize(totalSize)
    });
  } catch (error) {
    console.error('List documents error:', error);
    return errorResponse('Failed to fetch documents', 500);
  }
});

export const handleGetSignedUrl = asyncHandler(async (req, event, context) => {
  const { teamId } = context;
  const { id } = event.pathParameters;

  try {
    // Get document
    const { data: doc, error: docError } = await supabase
      .from('document')
      .select('storage_path, team_id, filename')
      .eq('id', id)
      .single();

    if (docError || !doc || doc.team_id !== teamId) {
      return errorResponse('Document not found', 404);
    }

    // Get signed URL (1 hour expiry)
    const { data, error } = await supabase
      .storage
      .from('documents')
      .createSignedUrl(doc.storage_path, 3600);

    if (error) throw error;
    return successResponse({ 
      url: data.signedUrl,
      filename: doc.filename
    });
  } catch (error) {
    console.error('Get signed URL error:', error);
    return errorResponse('Failed to generate download URL', 500);
  }
});

export const handleDeleteDocument = asyncHandler(async (req, event, context) => {
  const { teamId } = context;
  const { id } = event.pathParameters;

  try {
    // Get document
    const { data: doc, error: getError } = await supabase
      .from('document')
      .select('storage_path, team_id')
      .eq('id', id)
      .eq('team_id', teamId)
      .single();

    if (getError || !doc) return errorResponse('Document not found', 404);

    // Delete from storage (non-blocking, don't fail if storage delete fails)
    try {
      await supabase
        .storage
        .from('documents')
        .remove([doc.storage_path]);
    } catch (storageError) {
      console.error('Storage deletion warning:', storageError);
      // Continue anyway - mark as deleted in DB
    }

    // Mark as deleted in DB
    const { error: dbError } = await supabase
      .from('document')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (dbError) throw dbError;
    return successResponse({ deleted: true });
  } catch (error) {
    console.error('Delete document error:', error);
    return errorResponse('Failed to delete document', 500);
  }
});

export const handler = asyncHandler(async (event, context) => {
  const requestContext = await buildRequestContext(event, context);
  const { method, path } = event.requestContext.http;
  const { id } = event.pathParameters || {};

  if (method === 'GET' && !id) return await handleListDocuments(event, event, requestContext);
  if (method === 'GET' && path.includes('/download')) return await handleGetSignedUrl(event, event, requestContext);
  if (method === 'DELETE' && id) return await handleDeleteDocument(event, event, requestContext);

  return errorResponse('Not found', 404);
});
