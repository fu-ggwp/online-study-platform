// Wraps an async controller so thrown errors / rejected promises are
// forwarded to Express's error handler instead of crashing the process.
// Usage: router.get("/", asyncHandler(controller.list))
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
