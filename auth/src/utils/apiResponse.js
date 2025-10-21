export class ApiResponse {
  /**
   * Standard API success response
   * @param {number} statusCode - HTTP status code
   * @param {string} message - Human-readable message
   * @param {any} [data=null] - Optional payload
   */
  constructor(statusCode, message, data = null) {
    this.statusCode = statusCode;
    this.message = message;
    this.success = statusCode < 400;

    if (data !== null) {
      this.data = data;
    }
  }

  toJSON() {
    const json = {
      statusCode: this.statusCode,
      message: this.message,
      success: this.success,
    };

    if (this.data !== undefined) {
      json.data = this.data;
    }

    return json;
  }
}
