import { logger as defaultLogger } from "./logger.js";

/**
 * Wraps an async Express route or middleware with error handling and logging.
 *
 * @param {Function} fn - Async handler function (req, res, next)
 * @param {Object} [options] - Optional config
 * @param {Function} [options.logger] - Custom Winston-style logger with `.error()`
 * @param {Function} [options.formatError] - Optional custom error formatter
 * @returns {Function} Express-compatible middleware
 */
export const asyncHandler = (fn, options = {}) => {
  const logger = options.logger || defaultLogger;
  const formatError = options.formatError;

  return async (req, res, next) => {
    try {
      await fn(req, res, next);
    } catch (err) {
      logger.error(`[${req.method}] ${req.originalUrl} - ${err.message}`, {
        stack: err.stack,
        status: err.status || 500,
      });

      if (res.headersSent) return next(err);

      const status = err.status || 500;
      const response = formatError
        ? formatError(err, req)
        : {
            status: "error",
            message: err.message || "Internal Server Error",
          };

      res.status(status).json(response);
    }
  };
};
