export const validateInput = (data, schema) => {
  if (!data) throw new Error('Invalid input');
  return true;
};

export const serializeQuoteDto = (quote) => ({
  id: quote.id,
  quote_number: quote.quote_number,
  customer_id: quote.customer_id,
  origin: quote.origin,
  destination: quote.destination,
  status: quote.status,
  total_freight_cost: quote.total_freight_cost,
  markup_percentage: quote.markup_percentage,
  total_price: quote.total_price,
  valid_until: quote.valid_until,
  created_at: quote.created_at,
  updated_at: quote.updated_at,
});

export const serializeQuoteVersionDto = (version) => ({
  id: version.id,
  quote_id: version.quote_id,
  version_number: version.version_number,
  total_price: version.total_price,
  created_at: version.created_at,
});

export const serializeJobDto = (job) => ({
  id: job.id,
  job_number: job.job_number,
  quote_id: job.quote_id,
  status: job.status,
  departure_date: job.departure_date,
  created_at: job.created_at,
});

export const filterSensitiveFields = (data) => {
  const { password, secret, ...sanitized } = data;
  return sanitized;
};

export const filterSensitiveFieldsInArray = (arr) => {
  return arr.map(filterSensitiveFields);
};

export const parsePaginationParams = (query) => {
  const page = parseInt(query.get('page') || '1', 10);
  const limit = parseInt(query.get('limit') || '10', 10);
  return {
    page: Math.max(1, page),
    limit: Math.min(100, Math.max(1, limit)),
    offset: (Math.max(1, page) - 1) * Math.min(100, Math.max(1, limit)),
  };
};

export const buildPaginationMeta = (page, limit, total) => ({
  page,
  limit,
  total,
  pages: Math.ceil(total / limit),
});

export const validateQuoteLineData = (line) => {
  if (!line.description || !line.unit_price || !line.quantity) {
    throw new Error('Invalid quote line data');
  }
  return true;
};

export const calculateQuoteFinancials = (lines, markupPercentage = 0) => {
  const subtotal = lines.reduce((sum, line) => sum + (line.unit_price * line.quantity), 0);
  const markup = subtotal * (markupPercentage / 100);
  return {
    subtotal,
    markup,
    total: subtotal + markup,
  };
};

export const getApprovalRequirement = (totalPrice) => {
  if (totalPrice > 50000) return 'director';
  if (totalPrice > 10000) return 'manager';
  return 'finance';
};

export default {
  validateInput,
  serializeQuoteDto,
  serializeQuoteVersionDto,
  serializeJobDto,
  filterSensitiveFields,
  filterSensitiveFieldsInArray,
  parsePaginationParams,
  buildPaginationMeta,
  validateQuoteLineData,
  calculateQuoteFinancials,
  getApprovalRequirement,
};
