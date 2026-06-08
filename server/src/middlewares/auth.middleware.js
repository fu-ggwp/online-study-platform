import supabase from "../config/supabase.js";

// Verifies the Supabase JWT sent in the Authorization header and attaches
// the resolved user to `req.user`. Use on any route that requires login.
export async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ ok: false, error: "Missing access token" });
  }

  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data?.user) {
    return res.status(401).json({ ok: false, error: "Invalid or expired token" });
  }

  req.user = data.user;
  next();
}
