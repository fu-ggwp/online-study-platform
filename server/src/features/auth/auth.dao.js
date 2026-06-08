import supabase, { supabaseAdmin } from "../../config/supabase.js";
import { PROFILE_TABLE } from "../../models/profile.model.js";

// Data-access layer — talks to Supabase Auth + the `profiles` table only.
// No business logic here; that belongs in auth.service.js.

export function signUp({ email, password }) {
  return supabase.auth.signUp({ email, password });
}

export function signInWithPassword({ email, password }) {
  return supabase.auth.signInWithPassword({ email, password });
}

export function signOut(accessToken) {
  return supabase.auth.admin.signOut(accessToken);
}

export function sendPasswordResetEmail(email, redirectTo) {
  return supabase.auth.resetPasswordForEmail(email, { redirectTo });
}

export function updatePassword(accessToken, newPassword) {
  return supabase.auth.updateUser({ password: newPassword });
}

export function createProfile(profile) {
  return supabaseAdmin.from(PROFILE_TABLE).insert(profile).select().single();
}

export function findProfileById(id) {
  return supabase.from(PROFILE_TABLE).select("*").eq("id", id).single();
}
