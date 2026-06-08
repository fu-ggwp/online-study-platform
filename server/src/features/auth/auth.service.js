import * as authDao from "./auth.dao.js";
import { ProfileRoles } from "../../models/profile.model.js";

// Business logic — orchestrates DAO calls, applies rules from the SRS
// (e.g. BR rules around registration), and shapes results for controllers.

export async function register({ email, password, username, fullName }) {
  const { data, error } = await authDao.signUp({ email, password });
  if (error) throw Object.assign(new Error(error.message), { status: 400 });

  const userId = data.user?.id;
  if (userId) {
    const { error: profileError } = await authDao.createProfile({
      id: userId,
      username,
      full_name: fullName,
      role: ProfileRoles.LEARNER, // default role; teachers can be promoted later
    });
    if (profileError) throw Object.assign(new Error(profileError.message), { status: 400 });
  }

  return { user: data.user, session: data.session };
}

export async function login({ email, password }) {
  const { data, error } = await authDao.signInWithPassword({ email, password });
  if (error) throw Object.assign(new Error(error.message), { status: 401 });

  return { user: data.user, session: data.session };
}

export async function logout(accessToken) {
  const { error } = await authDao.signOut(accessToken);
  if (error) throw Object.assign(new Error(error.message), { status: 400 });
}

export async function requestPasswordReset(email, redirectTo) {
  const { error } = await authDao.sendPasswordResetEmail(email, redirectTo);
  if (error) throw Object.assign(new Error(error.message), { status: 400 });
}

export async function resetPassword(accessToken, newPassword) {
  const { error } = await authDao.updatePassword(accessToken, newPassword);
  if (error) throw Object.assign(new Error(error.message), { status: 400 });
}

export async function getCurrentProfile(userId) {
  const { data, error } = await authDao.findProfileById(userId);
  if (error) throw Object.assign(new Error(error.message), { status: 404 });
  return data;
}
