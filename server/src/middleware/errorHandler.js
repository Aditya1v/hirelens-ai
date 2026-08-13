/**
 * notFound - catches any request that didn't match a route.
 */
export function notFound(req, res, next) {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
}

/**
 * errorHandler - single place that turns any thrown error into a
 * consistent { success:false, message } JSON response. Keeps controllers
 * free of repeated try/catch + res.status(...).json(...) boilerplate.
 */
export function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode && err.statusCode >= 400 ? err.statusCode : 500;
  let message = err.message || "Internal server error";

  // Mongoose validation errors -> 400 with a readable message
  if (err.name === "ValidationError") {
    statusCode = 400;
    message = Object.values(err.errors).map((e) => e.message).join(", ");
  }

  // Duplicate key (e.g. email already registered)
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0] || "field";
    message = `${field} already in use`;
  }

  if (err.name === "CastError") {
    statusCode = 400;
    message = "Invalid identifier";
  }

  if (process.env.NODE_ENV !== "production") {
    console.error(err);
  }

  res.status(statusCode).json({
    success: false,
    message,
  });
}
