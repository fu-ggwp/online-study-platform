import { supabase, supabaseClient } from "../config/supabase.js";
import { USER_TABLE } from "../models/user.model.js";
// Verifies the Supabase JWT sent in the Authorization header and attaches
// the resolved user to `req.user`. Use on any route that requires login.
export async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ ok: false, error: "Missing access token" });
  }

  const { data, error } = await supabaseClient.auth.getUser(token);

  if (error || !data?.user) {
    return res.status(401).json({ ok: false, error: "Invalid or expired token" });
  }

  req.user = data.user;
  try {
    const { data: dbUser } = await supabase
      .from(USER_TABLE)
      .select("active_role, account_status")
      .eq("user_id", data.user.id)
      .single();
    if (dbUser) {
      // Block banned / non-active accounts from every protected feature (BR-11).
      if (dbUser.account_status !== "active") {
        return res.status(403).json({
          ok: false,
          error: "This account is not available. Please contact support.",
        });
      }
      req.user.role = dbUser.active_role; // Gán quyền từ DB vào đối tượng user
    }
  } catch (dbErr) {
    console.error("Failed to query user in requireAuth:", dbErr);
  }
  next();
}
