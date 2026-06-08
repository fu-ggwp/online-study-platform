import * as dao from "./admin.dao.js";
import { getPagination, buildPaginatedResponse } from "../../utils/pagination.js";

function dbError(error, status = 400) {
  return Object.assign(new Error(error.message), { status });
}
function notFound(message = "Not found") {
  return Object.assign(new Error(message), { status: 404 });
}

// User management → /admin/users
export async function listUsers(query) {
  const { from, to, page, limit } = getPagination(query);
  const { data, error, count } = await dao.listUsers({ from, to, role: query.role });
  if (error) throw dbError(error, 500);
  return buildPaginatedResponse({ items: data, count, page, limit });
}

export async function getUser(id) {
  const { data, error } = await dao.findUserById(id);
  if (error || !data) throw notFound("User not found");
  return data;
}

export async function updateUser(id, changes) {
  await getUser(id);
  const { data, error } = await dao.updateUser(id, changes);
  if (error) throw dbError(error);
  return data;
}

export async function suspendUser(id) {
  return updateUser(id, { is_suspended: true });
}

export async function reinstateUser(id) {
  return updateUser(id, { is_suspended: false });
}

// Class oversight → /admin/classes
export async function listClasses(query) {
  const { from, to, page, limit } = getPagination(query);
  const { data, error, count } = await dao.listClasses({ from, to });
  if (error) throw dbError(error, 500);
  return buildPaginatedResponse({ items: data, count, page, limit });
}

// Payment oversight → /admin/payments
export async function listPayments(query) {
  const { from, to, page, limit } = getPagination(query);
  const { data, error, count } = await dao.listPayments({ from, to });
  if (error) throw dbError(error, 500);
  return buildPaginatedResponse({ items: data, count, page, limit });
}

// Premium plan management → /admin/plans
export async function listPlans() {
  const { data, error } = await dao.listPlans();
  if (error) throw dbError(error, 500);
  return data;
}

export async function createPlan(payload) {
  if (!payload?.name?.trim()) throw Object.assign(new Error("Name is required"), { status: 422 });

  const { data, error } = await dao.createPlan({
    name: payload.name,
    price: payload.price,
    currency: payload.currency || "USD",
    duration_days: payload.durationDays,
    features: payload.features || [],
    is_active: payload.isActive ?? true,
  });
  if (error) throw dbError(error);
  return data;
}

export async function updatePlan(id, changes) {
  const { data, error } = await dao.updatePlan(id, changes);
  if (error) throw dbError(error);
  if (!data) throw notFound("Premium plan not found");
  return data;
}

export async function removePlan(id) {
  const { error } = await dao.removePlan(id);
  if (error) throw dbError(error);
}
