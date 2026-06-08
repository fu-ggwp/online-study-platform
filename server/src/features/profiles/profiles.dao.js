import supabase from "../../config/supabase.js";
import { PROFILE_TABLE } from "../../models/profile.model.js";

export function findById(id) {
  return supabase.from(PROFILE_TABLE).select("*").eq("id", id).single();
}

export function findByUsername(username) {
  return supabase.from(PROFILE_TABLE).select("*").eq("username", username).single();
}

export function update(id, changes) {
  return supabase.from(PROFILE_TABLE).update(changes).eq("id", id).select().single();
}
