/**
 * Higher-order function to catch async errors in Express routes
 * @param {Function} fn - Async express route handler
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
