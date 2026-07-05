/**
 * Standardized success response wrapper so every REST endpoint returns
 * the same shape: { statusCode, data, message, success }
 */
class ApiResponse {
  constructor(statusCode, data = null, message = 'Success') {
    this.statusCode = statusCode;
    this.data = data;
    this.message = message;
    this.success = statusCode < 400;
  }

  send(res) {
    return res.status(this.statusCode).json(this);
  }
}

export default ApiResponse;
