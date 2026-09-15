export const asyncHandler = (fn) => async (...args) => {
  try {
    return await fn(...args);
  } catch (error) {
    console.error('Handler error:', error);
    throw error;
  }
};

export default asyncHandler;
