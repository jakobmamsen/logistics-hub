export const validateInput = (data, schema) => {
  return Boolean(data);
};

export const requirePermission = (permission) => (req, res, next) => {
  return next();
};

export const sanitizeOutput = (data) => {
  return data;
};

export default { validateInput, requirePermission, sanitizeOutput };
