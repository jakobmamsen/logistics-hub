// ============================================================================
// LOGISTICS HUB RELEASE 1 — API UTILITIES
// ============================================================================
// File: api-utils.js
// Purpose: DTO serialization, data transformation, validation, and helpers
// Dependencies: None (pure utility functions)
// Status: Production-ready for Release 1
//
// Key features:
// 1. DTO serialization (hide sensitive data based on role)
// 2. Data validation (schema validation, format checking)
// 3. Date/time utilities (UTC, timezone handling)
// 4. Financial calculations (rounding, margin %)
// 5. Pagination helpers
// 6. Search/filter helpers
//
// ============================================================================

// ============================================================================
// 1. SENSITIVE FIELD FILTERING
// ============================================================================
// Hide pricing data from operations role

const SENSITIVE_FIELDS = {
  quote: ['buy_unit_price', 'buy_currency', 'buy_total', 'gross_profit', 'margin_percent', 'pricing_snapshot'],
  quoteVersion: ['buy_total', 'gross_profit', 'margin_percent', 'pricing_snapshot'],
  quoteLine: ['buy_unit_price', 'buy_currency', 'buy_total'],
  job: ['gross_profit', 'margin_percent']
};

export function filterSensitiveFields(data, resource, role) {
  if (!data || role === 'admin' || role === 'manager' || role === 'finance' || role === 'commercial') {
    // These roles can see everything
    return data;
  }
  
  if (role === 'operations') {
    // Operations role cannot see pricing data
    const fieldsToHide = SENSITIVE_FIELDS[resource] || [];
    const filtered = { ...data };
    
    fieldsToHide.forEach(field => {
      delete filtered[field];
    });
    
    return filtered;
  }
  
  return data;
}

export function filterSensitiveFieldsInArray(data, resource, role) {
  if (!Array.isArray(data)) {
    return filterSensitiveFields(data, resource, role);
  }
  
  return data.map(item => filterSensitiveFields(item, resource, role));
}

// ============================================================================
// 2. DTO SERIALIZATION
// ============================================================================
// Convert database rows to API response DTOs

export function serializeQuoteDto(quote, role = 'admin') {
  const dto = {
    id: quote.id,
    requestId: quote.request_id,
    status: quote.status,
    createdBy: quote.created_by,
    createdByName: quote.created_by_name,
    createdAt: quote.created_at,
    updatedAt: quote.updated_at,
    expiresAt: quote.expires_at
  };
  
  // Filter sensitive fields based on role
  return filterSensitiveFields(dto, 'quote', role);
}

export function serializeQuoteVersionDto(quoteVersion, role = 'admin') {
  const dto = {
    id: quoteVersion.id,
    quoteId: quoteVersion.quote_id,
    versionNumber: quoteVersion.version_number,
    status: quoteVersion.status,
    submittedAt: quoteVersion.submitted_at,
    
    // Financial snapshot (immutable after submission)
    ...(role !== 'operations' && {
      buyTotal: quoteVersion.buy_total,
      buyTotalCurrency: quoteVersion.buy_total_currency,
      sellTotal: quoteVersion.sell_total,
      sellTotalCurrency: quoteVersion.sell_total_currency,
      marginPercent: quoteVersion.margin_percent,
      pricingSnapshot: quoteVersion.pricing_snapshot
    })
  };
  
  return filterSensitiveFields(dto, 'quoteVersion', role);
}

export function serializeJobDto(job, role = 'admin') {
  return {
    id: job.id,
    quoteId: job.quote_id,
    status: job.status,
    referenceNumber: job.reference_number,
    customerId: job.customer_id,
    createdAt: job.created_at,
    updatedAt: job.updated_at,
    tmsReference: job.tms_reference,
    origin: {
      port: job.origin_port,
      country: job.origin_country,
      city: job.origin_city
    },
    destination: {
      port: job.destination_port,
      country: job.destination_country,
      city: job.destination_city
    }
  };
}

export function serializeTaskDto(task) {
  return {
    id: task.id,
    jobId: task.job_id,
    title: task.title,
    description: task.description,
    status: task.status,
    assignedTo: task.assigned_to,
    assignedToName: task.assigned_to_name,
    dueDate: task.due_date,
    priority: task.priority,
    createdAt: task.created_at,
    completedAt: task.completed_at
  };
}

export function serializeDocumentDto(document) {
  return {
    id: document.id,
    jobId: document.job_id,
    type: document.document_type,
    typeName: document.type_name,
    fileName: document.file_name,
    uploadedBy: document.uploaded_by,
    uploadedByName: document.uploaded_by_name,
    uploadedAt: document.uploaded_at,
    version: document.version,
    fileSize: document.file_size,
    mimeType: document.mime_type
  };
}

export function serializeExceptionDto(exception) {
  return {
    id: exception.id,
    jobId: exception.job_id,
    type: exception.exception_type,
    severity: exception.severity,
    description: exception.description,
    status: exception.status,
    reportedBy: exception.reported_by,
    reportedByName: exception.reported_by_name,
    reportedAt: exception.reported_at,
    resolvedAt: exception.resolved_at
  };
}

// ============================================================================
// 3. DATA VALIDATION
// ============================================================================
// Schema validation and format checking

export class ValidationResult {
  constructor() {
    this.errors = [];
    this.isValid = true;
  }
  
  addError(field, message) {
    this.errors.push({ field, message });
    this.isValid = false;
  }
  
  throwIfInvalid() {
    if (!this.isValid) {
      throw new Error(`Validation failed: ${JSON.stringify(this.errors)}`);
    }
  }
}

export function validateEmail(email) {
  const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
  return emailRegex.test(email);
}

export function validateQuoteLineData(line) {
  const result = new ValidationResult();
  
  if (!line.description || line.description.trim() === '') {
    result.addError('description', 'Description is required');
  }
  
  if (!line.quantity || line.quantity <= 0) {
    result.addError('quantity', 'Quantity must be positive');
  }
  
  if (!line.unit_id) {
    result.addError('unit_id', 'Unit is required');
  }
  
  if (!line.sell_unit_price || line.sell_unit_price <= 0) {
    result.addError('sell_unit_price', 'Sell price must be positive');
  }
  
  if (line.buy_unit_price !== null && line.buy_unit_price <= 0) {
    result.addError('buy_unit_price', 'Buy price must be positive');
  }
  
  return result;
}

export function validateJobCreationData(data) {
  const result = new ValidationResult();
  
  if (!data.quote_id) {
    result.addError('quote_id', 'Quote ID is required');
  }
  
  if (!data.customer_id) {
    result.addError('customer_id', 'Customer ID is required');
  }
  
  if (!data.origin_port_id) {
    result.addError('origin_port_id', 'Origin port is required');
  }
  
  if (!data.destination_port_id) {
    result.addError('destination_port_id', 'Destination port is required');
  }
  
  return result;
}

// ============================================================================
// 4. FINANCIAL CALCULATIONS
// ============================================================================
// Pricing and margin calculations with proper rounding

export function roundPrice(value, decimals = 2) {
  return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

export function roundRate(value, decimals = 4) {
  return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

export function calculateLineTotals(quantity, unitPrice, fxRate = 1) {
  const lineTotal = roundPrice(quantity * unitPrice);
  const lineTotalInBuyCurrency = roundPrice(lineTotal / fxRate);
  
  return {
    lineTotal,
    lineTotalInBuyCurrency
  };
}

export function calculateMarginPercent(grossProfit, sellTotal) {
  if (sellTotal <= 0) return 0;
  return roundPrice((grossProfit / sellTotal) * 100, 2);
}

export function calculateQuoteFinancials(lines) {
  // lines: [{ sell_unit_price, buy_unit_price, quantity, fx_rate }, ...]
  
  let sellTotal = 0;
  let buyTotal = 0;
  
  lines.forEach(line => {
    const sellLineTotal = roundPrice(line.quantity * line.sell_unit_price);
    const buyLineTotal = line.buy_unit_price 
      ? roundPrice(line.quantity * line.buy_unit_price)
      : 0;
    
    sellTotal += sellLineTotal;
    buyTotal += buyLineTotal;
  });
  
  // Convert buy total to sell currency using FX rate
  const fxRate = lines[0]?.fx_rate || 1;
  const buyTotalInSellCurrency = roundPrice(buyTotal / fxRate);
  
  const grossProfit = roundPrice(buyTotalInSellCurrency - sellTotal);
  const marginPercent = calculateMarginPercent(grossProfit, sellTotal);
  
  return {
    sellTotal: roundPrice(sellTotal),
    buyTotal: roundPrice(buyTotal),
    buyTotalInSellCurrency,
    grossProfit,
    marginPercent,
    fxRate: roundRate(fxRate)
  };
}

export function shouldRequireApproval(marginPercent, sellTotal) {
  // Approval required if:
  // - Margin < 15% OR
  // - Sell total > €10,000
  return marginPercent < 15 || sellTotal > 10000;
}

export function getApprovalRequirement(marginPercent, sellTotal) {
  const reasons = [];
  
  if (marginPercent < 15) {
    reasons.push(`Low margin: ${marginPercent}% (threshold: 15%)`);
  }
  
  if (sellTotal > 10000) {
    reasons.push(`High value: €${sellTotal.toFixed(2)} (threshold: €10,000)`);
  }
  
  return {
    requiresApproval: reasons.length > 0,
    reasons
  };
}

// ============================================================================
// 5. DATE/TIME UTILITIES
// ============================================================================
// UTC handling and timezone conversions

export function getCurrentUTC() {
  return new Date().toISOString();
}

export function parseDate(dateStr) {
  return new Date(dateStr);
}

export function formatDate(date, format = 'YYYY-MM-DD') {
  // Simple date formatting (use date-fns in production)
  const d = new Date(date);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  
  if (format === 'YYYY-MM-DD') {
    return `${year}-${month}-${day}`;
  }
  
  return d.toISOString();
}

export function addDays(date, days) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

export function addBusinessDays(date, businessDays) {
  let count = 0;
  let current = new Date(date);
  
  while (count < businessDays) {
    current.setUTCDate(current.getUTCDate() + 1);
    const dayOfWeek = current.getUTCDay();
    
    // Skip weekends (0 = Sunday, 6 = Saturday)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
  }
  
  return current;
}

// ============================================================================
// 6. PAGINATION HELPERS
// ============================================================================
// Common pagination utilities

export function parsePaginationParams(query) {
  const page = Math.max(1, parseInt(query.page || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(query.limit || '20')));
  const offset = (page - 1) * limit;
  
  return { page, limit, offset };
}

export function buildPaginationMeta(page, limit, total) {
  const totalPages = Math.ceil(total / limit);
  
  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1
  };
}

export function paginateArray(array, page, limit) {
  const offset = (page - 1) * limit;
  const paginatedItems = array.slice(offset, offset + limit);
  
  return {
    items: paginatedItems,
    meta: buildPaginationMeta(page, limit, array.length)
  };
}

// ============================================================================
// 7. SEARCH AND FILTER HELPERS
// ============================================================================
// Query building utilities

export function buildSearchQuery(searchTerm) {
  if (!searchTerm) return null;
  
  // Simple substring search (use full-text search in production)
  return `%${searchTerm}%`;
}

export function buildStatusFilter(statusParam) {
  if (!statusParam) return null;
  
  // Allow comma-separated statuses
  return statusParam.split(',').map(s => s.trim());
}

export function buildDateRangeFilter(fromDate, toDate) {
  return {
    ...(fromDate && { gte: fromDate }),
    ...(toDate && { lte: toDate })
  };
}

// ============================================================================
// 8. RESPONSE ENVELOPE BUILDERS
// ============================================================================
// Standard response structures

export function buildPaginatedResponse(items, meta) {
  return {
    success: true,
    data: items,
    pagination: meta
  };
}

export function buildErrorResponse(message, code = 'ERROR', details = null) {
  return {
    success: false,
    error: {
      message,
      code,
      ...(details && { details })
    }
  };
}

// ============================================================================
// 9. TYPE CONVERSION HELPERS
// ============================================================================

export function toBoolean(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true' || value === '1';
  }
  return Boolean(value);
}

export function toInt(value) {
  return parseInt(value, 10);
}

export function toFloat(value) {
  return parseFloat(value);
}

// ============================================================================
// 10. ENUM VALIDATORS
// ============================================================================

export const QUOTE_STATUS = {
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  SENT: 'sent',
  WON: 'won',
  LOST: 'lost'
};

export const JOB_STATUS = {
  PENDING: 'pending',
  ACTIVE: 'active',
  ON_HOLD: 'on_hold',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
};

export const TASK_STATUS = {
  OPEN: 'open',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
};

export const EXCEPTION_SEVERITY = {
  INFO: 'info',
  WARNING: 'warning',
  CRITICAL: 'critical'
};

export const INCOTERM = {
  EXW: 'EXW',
  FOB: 'FOB',
  CIF: 'CIF',
  CIP: 'CIP',
  DAP: 'DAP',
  DDP: 'DDP',
  CFR: 'CFR'
};

export function isValidQuoteStatus(status) {
  return Object.values(QUOTE_STATUS).includes(status);
}

export function isValidJobStatus(status) {
  return Object.values(JOB_STATUS).includes(status);
}

export function isValidTaskStatus(status) {
  return Object.values(TASK_STATUS).includes(status);
}

// ============================================================================
// END OF api-utils.js
// ============================================================================
