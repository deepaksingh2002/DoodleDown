import ApiError from '../utils/ApiError.js';
import logger from '../utils/logger.js';
import env from '../config/env.js';

// eslint-disable-next-line no-unused-vars
function errorMiddleware(err, req, res, next) {
  let error = err;

  // Convert non-ApiError errors (e.g. thrown by libraries) into ApiError
  if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || 500;
    const message = error.message || 'Internal server error';
    error = new ApiError(statusCode, message, error?.errors || [], err.stack);
  }

  logger.error(
    `[${req.method}] ${req.originalUrl} -> ${error.statusCode} :: ${error.message}`
  );
  if (env.NODE_ENV === 'development') {
    logger.error(error.stack);
  }

  const response = {
    success: false,
    statusCode: error.statusCode,
    message: error.message,
    errors: error.errors,
    ...(env.NODE_ENV === 'development' ? { stack: error.stack } : {}),
  };

  return res.status(error.statusCode).json(response);
}

export default errorMiddleware;
