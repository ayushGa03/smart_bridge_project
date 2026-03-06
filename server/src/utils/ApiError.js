// src/utils/ApiError.js
class ApiError extends Error {
  constructor(statusCode, message, errors = []) {
    super(message);
    this.statusCode = statusCode;
    this.message = message;
    this.errors = errors;
    this.success = false;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = ApiError;
