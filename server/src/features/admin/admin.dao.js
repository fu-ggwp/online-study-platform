import supabase from "../../config/supabase.js";
import { PROFILE_TABLE } from "../../models/profile.model.js";
import { CLASS_TABLE } from "../../models/class.model.js";
import { PAYMENT_TABLE } from "../../models/payment.model.js";
import { PREMIUM_PLAN_TABLE } from "../../models/premium-plan.model.js";

export function listUsers({ from, to, role } = {}) {
  let query = supabase.from(PROFILE_TABLE).select("*", { count: "exact" }).order("created_at", { ascending: false });
  if (role) query = query.eq("role", role);
  if (from != null && to != null) query = query.range(from, to);
  return query;
}

export function findUserById(id) {
  return supabase.from(PROFILE_TABLE).select("*").eq("id", id).single();
}

export function updateUser(id, changes) {
  return supabase.from(PROFILE_TABLE).update(changes).eq("id", id).select().single();
}

export function listClasses({ from, to } = {}) {
  let query = supabase.from(CLASS_TABLE).select("*, profiles(username, full_name)", { count: "exact" });
  if (from != null && to != null) query = query.range(from, to);
  return query;
}

export function listPayments({ from, to } = {}) {
  let query = supabase
    .from(PAYMENT_TABLE)
    .select("*, profiles(username, full_name)", { count: "exact" })
    .order("created_at", { ascending: false });
  if (from != null && to != null) query = query.range(from, to);
  return query;
}

export function listPlans() {
  return supabase.from(PREMIUM_PLAN_TABLE).select("*");
}

export function createPlan(payload) {
  return supabase.from(PREMIUM_PLAN_TABLE).insert(payload).select().single();
}

export function updatePlan(id, changes) {
  return supabase.from(PREMIUM_PLAN_TABLE).update(changes).eq("id", id).select().single();
}

export function removePlan(id) {
  return supabase.from(PREMIUM_PLAN_TABLE).delete().eq("id", id);
}
