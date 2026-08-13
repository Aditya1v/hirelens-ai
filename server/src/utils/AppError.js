// Lightweight error class carrying an HTTP status code, so route handlers
// can `throw new AppError("message", 404)` and let the central error
// middleware turn it into a consistent JSON response.
export class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
  }
}

// Wraps an async Express handler so rejected promises are forwarded to
// next(err) automatically instead of needing try/catch in every controller.
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
