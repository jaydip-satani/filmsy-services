export class ApiError extends Error {
  /**
   * Creates a new ApiError instance
   * @param {number} statusCode - HTTP status code
   * @param {string} message - Error message
   * @param {Array} [errors=[]] - Optional array of sub-errors (e.g., validation errors)
   * @param {string} [stack] - Optional stack trace override
   */
  constructor(
    statusCode,
    message = "Something went wrong",
    errors = [],
    stack = ""
  ) {
    super(message);

    this.statusCode = statusCode;
    this.message = message;
    this.errors = errors;
    this.success = false;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
  toJSON() {
    const json = {
      statusCode: this.statusCode,
      message: this.message,
      errors: this.errors,
      success: false,
    };

    if (process.env.NODE_ENV !== "production") {
      json.stack = this.stack;
    }

    return json;
  }
}
