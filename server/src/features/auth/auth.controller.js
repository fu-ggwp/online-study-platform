import {
  forgotPassword as forgotPasswordRequest,
  getCurrentProfile,
  loginAccount,
  logout as logoutAccount,
  registerAccount,
  resetPassword as resetPasswordRequest,
} from "./auth.service.js";
import {
  validateLoginPayload,
  validateRegisterPayload,
} from "./auth.validation.js";

function sendError(res, error) {
  const statusCode = error.statusCode || error.status || 500;

  return res.status(statusCode).json({
    message: error.message || "Authentication request failed.",
    fields: error.fields,
  });
}

export async function register(req, res) {
  const result = validateRegisterPayload(req.body);

  if (!result.valid) {
    return res.status(400).json({
      message: "The information is invalid. Please check and try again.",
      fields: result.errors,
    });
  }

  try {
    const data = await registerAccount(result.data);
    return res.status(201).json(data);
  } catch (error) {
    return sendError(res, error);
  }
}

export async function login(req, res) {
  const result = validateLoginPayload(req.body);

  if (!result.valid) {
    return res.status(400).json({
      message: "Please complete all required information.",
      fields: result.errors,
    });
  }

  try {
    const data = await loginAccount(result.data);
    return res.status(200).json(data);
  } catch (error) {
    return sendError(res, error);
  }
}

export async function logout(req, res) {
  try {
    const token = (req.headers.authorization || "").replace("Bearer ", "");
    await logoutAccount(token);
    return res.status(200).json({ message: "Logged out" });
  } catch (error) {
    return sendError(res, error);
  }
}

export async function forgotPassword(req, res) {
  try {
    const { email, redirectTo } = req.body;
    await forgotPasswordRequest(email, redirectTo);
    return res.status(200).json({ message: "Password reset email sent" });
  } catch (error) {
    return sendError(res, error);
  }
}

export async function resetPassword(req, res) {
  try {
    const token = (req.headers.authorization || "").replace("Bearer ", "");
    const { newPassword } = req.body;
    await resetPasswordRequest(token, newPassword);
    return res.status(200).json({ message: "Password updated" });
  } catch (error) {
    return sendError(res, error);
  }
}

export async function me(req, res) {
  try {
    const profile = await getCurrentProfile(req.user.id);
    return res.status(200).json(profile);
  } catch (error) {
    return sendError(res, error);
  }
}
