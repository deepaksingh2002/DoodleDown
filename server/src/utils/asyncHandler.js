/**
 * Wraps an async Express route handler so any rejected promise / thrown error
 * is automatically forwarded to next(), reaching the global error middleware
 * instead of crashing the process or requiring a try/catch in every controller.
 *
 * Usage:
 *   router.get('/rooms/:id', asyncHandler(roomController.getRoom));
 */
const asyncHandler = (requestHandler) => (req, res, next) => {
  Promise.resolve(requestHandler(req, res, next)).catch(next);
};

export default asyncHandler;
