import supabase from "../../config/supabase.js";
import { PAYMENT_TABLE } from "../../models/payment.model.js";
import { PREMIUM_PLAN_TABLE } from "../../models/premium-plan.model.js";

export function findActivePlans() {
  return supabase.from(PREMIUM_PLAN_TABLE).select("*").eq("is_active", true);
}

export function findPlanById(id) {
  return supabase.from(PREMIUM_PLAN_TABLE).select("*").eq("id", id).single();
}

export function findPaymentsByUser(userId) {
  return supabase
    .from(PAYMENT_TABLE)
    .select("*, premium_plans(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
}

export function findPaymentById(id) {
  return supabase.from(PAYMENT_TABLE).select("*").eq("id", id).single();
}

export function findPaymentByProviderRef(providerRef) {
  return supabase.from(PAYMENT_TABLE).select("*").eq("provider_ref", providerRef).single();
}

export function createPayment(payload) {
  return supabase.from(PAYMENT_TABLE).insert(payload).select().single();
}

export function updatePayment(id, changes) {
  return supabase.from(PAYMENT_TABLE).update(changes).eq("id", id).select().single();
}
