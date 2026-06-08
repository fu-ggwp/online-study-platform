import supabase, { supabaseAdmin } from "../../config/supabase.js";
import { createUserModel } from "../../models/user.model.js";
import { createUserRoleModel } from "../../models/user-role.model.js";

const db = supabaseAdmin || supabase;
const userModel = createUserModel(db);
const userRoleModel = createUserRoleModel(db);

function serviceError(message, statusCode, fields) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.fields = fields;
  return error;
}

export async function registerAccount({ fullName, username, email, password }) {
  const existingEmail = await userModel.findByEmail(email);
  if (existingEmail) {
    throw serviceError(
      "This email is already associated with another account.",
      409,
      { email: "This email is already associated with another account." }
    );
  }

  const existingUsername = await userModel.findByUsername(username);
  if (existingUsername) {
    throw serviceError(
      "This username is already associated with another account.",
      409,
      { username: "This username is already associated with another account." }
    );
  }

  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        username,
      },
    },
  });

  if (signUpError) {
    signUpError.statusCode = signUpError.status || 400;
    throw signUpError;
  }

  const authUser = signUpData.user;
  if (!authUser?.id) {
    throw serviceError("Account could not be created. Please try again.", 502);
  }

  let profile;
  try {
    profile = await userModel.create({
      userId: authUser.id,
      email,
      username,
      fullName,
    });
  } catch (error) {
    error.statusCode = 500;
    throw error;
  }

  try {
    await userRoleModel.create({
      userId: authUser.id,
      role: "learner",
    });
  } catch (error) {
    error.statusCode = 500;
    throw error;
  }

  return {
    message: "Your account has been created successfully.",
    session: signUpData.session,
    user: userModel.toPublic(profile),
  };
}

export async function loginAccount({ email, password }) {
  const { data: signInData, error: signInError } =
    await supabase.auth.signInWithPassword({ email, password });

  if (signInError) {
    throw serviceError("Incorrect email or password. Please try again.", 401);
  }

  const profile = await userModel.findByEmail(email);
  if (!profile) {
    throw serviceError("Account profile was not found.", 404);
  }

  if (profile.account_status !== "active") {
    throw serviceError("This account is not available. Please contact support.", 403);
  }

  return {
    message: "Login successful. Welcome back.",
    session: signInData.session,
    user: userModel.toPublic(profile),
  };
}

export async function logout(accessToken) {
  if (!accessToken) {
    throw serviceError("Missing access token.", 401);
  }

  if (!supabaseAdmin) {
    throw serviceError("Supabase admin client is not configured.", 500);
  }

  const { error } = await supabaseAdmin.auth.admin.signOut(accessToken);
  if (error) {
    error.statusCode = error.status || 400;
    throw error;
  }
}

export async function forgotPassword(email, redirectTo) {
  if (!email) {
    throw serviceError("Please enter your email.", 400, {
      email: "Please enter your email.",
    });
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  });

  if (error) {
    error.statusCode = error.status || 400;
    throw error;
  }
}

export async function resetPassword(accessToken, newPassword) {
  if (!accessToken) {
    throw serviceError("Missing access token.", 401);
  }

  if (!newPassword || newPassword.length < 8) {
    throw serviceError("Password must be at least 8 characters.", 400, {
      newPassword: "Password must be at least 8 characters.",
    });
  }

  const scopedClient = supabase.auth.setSession
    ? supabase
    : null;

  if (!scopedClient) {
    throw serviceError("Password reset is not available.", 500);
  }

  const { error: sessionError } = await scopedClient.auth.setSession({
    access_token: accessToken,
    refresh_token: accessToken,
  });

  if (sessionError) {
    sessionError.statusCode = sessionError.status || 401;
    throw sessionError;
  }

  const { error } = await scopedClient.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    error.statusCode = error.status || 400;
    throw error;
  }
}

export async function getCurrentProfile(userId) {
  const profile = await userModel.findById(userId);

  if (!profile) {
    throw serviceError("Account profile was not found.", 404);
  }

  return userModel.toPublic(profile);
}
