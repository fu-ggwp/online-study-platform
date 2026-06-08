// Centralized error handler — register last with app.use(errorHandler).
// Lets controllers/services just `throw` and have errors land here in a
// consistent { ok: false, error } shape.
export function errorHandler(err, req, res, next) {
  console.error(err);

  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal server error";

  res.status(status).json({ ok: false, error: message });
}

export function notFoundHandler(req, res) {
  res.status(404).json({ ok: false, error: `Route not found: ${req.method} ${req.originalUrl}` });
}
