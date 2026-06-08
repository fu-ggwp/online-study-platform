import * as authService from "./auth.service.js";
import { ok, fail } from "../../utils/api-response.js";

export async function register(req, res) {
  try {
    const result = await authService.register(req.body);
    return ok(res, result, 201);
  } catch (err) {
    return fail(res, err, err.status || 400);
  }
}

export async function login(req, res) {
  try {
    const result = await authService.login(req.body);
    return ok(res, result);
  } catch (err) {
    return fail(res, err, err.status || 401);
  }
}

export async function logout(req, res) {
  try {
    const token = (req.headers.authorization || "").replace("Bearer ", "");
    await authService.logout(token);
    return ok(res, { message: "Logged out" });
  } catch (err) {
    return fail(res, err, err.status || 400);
  }
}

export async function forgotPassword(req, res) {
  try {
    const { email, redirectTo } = req.body;
    await authService.requestPasswordReset(email, redirectTo);
    return ok(res, { message: "Password reset email sent" });
  } catch (err) {
    return fail(res, err, err.status || 400);
  }
}

export async function resetPassword(req, res) {
  try {
    const token = (req.headers.authorization || "").replace("Bearer ", "");
    const { newPassword } = req.body;
    await authService.resetPassword(token, newPassword);
    return ok(res, { message: "Password updated" });
  } catch (err) {
    return fail(res, err, err.status || 400);
  }
}

export async function me(req, res) {
  try {
    const profile = await authService.getCurrentProfile(req.user.id);
    return ok(res, profile);
  } catch (err) {
    return fail(res, err, err.status || 404);
  }
}
