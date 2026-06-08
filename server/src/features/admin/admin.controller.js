import * as service from "./admin.service.js";
import { ok, fail } from "../../utils/api-response.js";

export const listUsers = async (req, res) => {
  try { return ok(res, await service.listUsers(req.query)); }
  catch (err) { return fail(res, err, err.status || 500); }
};

export const getUser = async (req, res) => {
  try { return ok(res, await service.getUser(req.params.id)); }
  catch (err) { return fail(res, err, err.status || 404); }
};

export const updateUser = async (req, res) => {
  try { return ok(res, await service.updateUser(req.params.id, req.body)); }
  catch (err) { return fail(res, err, err.status || 400); }
};

export const suspendUser = async (req, res) => {
  try { return ok(res, await service.suspendUser(req.params.id)); }
  catch (err) { return fail(res, err, err.status || 400); }
};

export const reinstateUser = async (req, res) => {
  try { return ok(res, await service.reinstateUser(req.params.id)); }
  catch (err) { return fail(res, err, err.status || 400); }
};

export const listClasses = async (req, res) => {
  try { return ok(res, await service.listClasses(req.query)); }
  catch (err) { return fail(res, err, err.status || 500); }
};

export const listPayments = async (req, res) => {
  try { return ok(res, await service.listPayments(req.query)); }
  catch (err) { return fail(res, err, err.status || 500); }
};

export const listPlans = async (req, res) => {
  try { return ok(res, await service.listPlans()); }
  catch (err) { return fail(res, err, err.status || 500); }
};

export const createPlan = async (req, res) => {
  try { return ok(res, await service.createPlan(req.body), 201); }
  catch (err) { return fail(res, err, err.status || 400); }
};

export const updatePlan = async (req, res) => {
  try { return ok(res, await service.updatePlan(req.params.id, req.body)); }
  catch (err) { return fail(res, err, err.status || 400); }
};

export const removePlan = async (req, res) => {
  try { await service.removePlan(req.params.id); return ok(res, { message: "Deleted" }); }
  catch (err) { return fail(res, err, err.status || 400); }
};
