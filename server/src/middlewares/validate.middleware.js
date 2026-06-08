// Validates req.body / req.query / req.params against a Zod schema.
// Usage: router.post("/", validate(createClassSchema), controller.create)
export function validate(schema, source = "body") {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      return res.status(400).json({
        ok: false,
        error: "Validation failed",
        details: result.error.flatten(),
      });
    }

    req[source] = result.data;
    next();
  };
}
