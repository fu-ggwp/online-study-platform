import * as service from "./payments.service.js";
import { ok, fail } from "../../utils/api-response.js";

export const listPlans = async (req, res) => {
  try { return ok(res, await service.listPlans()); }
  catch (err) { return fail(res, err, err.status || 500); }
};

export const listMine = async (req, res) => {
  try { return ok(res, await service.listMyPayments(req.user.id)); }
  catch (err) { return fail(res, err, err.status || 500); }
};

export const getOne = async (req, res) => {
  try { return ok(res, await service.getPayment(req.params.id)); }
  catch (err) { return fail(res, err, err.status || 404); }
};

export const startCheckout = async (req, res) => {
  try { return ok(res, await service.startCheckout(req.user.id, req.body.planId), 201); }
  catch (err) { return fail(res, err, err.status || 400); }
};

// Provider webhook — no auth (verified via signature inside the gateway service)
export const webhook = async (req, res) => {
  try { return ok(res, await service.handleWebhook(req.body)); }
  catch (err) { return fail(res, err, err.status || 400); }
};
