import * as service from "./analytics.service.js";
import { ok, fail } from "../../utils/api-response.js";

export const listReports = async (req, res) => {
  try { return ok(res, await service.listReports(req.user.id)); }
  catch (err) { return fail(res, err, err.status || 500); }
};

export const getReport = async (req, res) => {
  try { return ok(res, await service.getReport(req.params.id)); }
  catch (err) { return fail(res, err, err.status || 404); }
};

export const generateClassReport = async (req, res) => {
  try { return ok(res, await service.generateClassReport(req.user.id, req.params.classId), 201); }
  catch (err) { return fail(res, err, err.status || 400); }
};

export const generateLearnerReport = async (req, res) => {
  try { return ok(res, await service.generateLearnerReport(req.user.id), 201); }
  catch (err) { return fail(res, err, err.status || 400); }
};
