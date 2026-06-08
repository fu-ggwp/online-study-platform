import * as service from "./exams.service.js";
import { ok, fail } from "../../utils/api-response.js";

export const listMine = async (req, res) => {
  try { return ok(res, await service.listMine(req.user.id)); }
  catch (err) { return fail(res, err, err.status || 500); }
};

export const listForClass = async (req, res) => {
  try { return ok(res, await service.listForClass(req.params.classId)); }
  catch (err) { return fail(res, err, err.status || 500); }
};

export const getOne = async (req, res) => {
  try { return ok(res, await service.getOne(req.params.id)); }
  catch (err) { return fail(res, err, err.status || 404); }
};

export const create = async (req, res) => {
  try { return ok(res, await service.create(req.user.id, req.body), 201); }
  catch (err) { return fail(res, err, err.status || 400); }
};

export const update = async (req, res) => {
  try { return ok(res, await service.update(req.params.id, req.user.id, req.body)); }
  catch (err) { return fail(res, err, err.status || 400); }
};

export const remove = async (req, res) => {
  try { await service.remove(req.params.id, req.user.id); return ok(res, { message: "Deleted" }); }
  catch (err) { return fail(res, err, err.status || 400); }
};

export const listAttempts = async (req, res) => {
  try { return ok(res, await service.listAttempts(req.params.id, req.user.id)); }
  catch (err) { return fail(res, err, err.status || 403); }
};

// Learner endpoints
export const startAttempt = async (req, res) => {
  try { return ok(res, await service.startAttempt(req.params.id, req.user.id), 201); }
  catch (err) { return fail(res, err, err.status || 400); }
};

export const listMyAttempts = async (req, res) => {
  try { return ok(res, await service.listMyAttempts(req.user.id)); }
  catch (err) { return fail(res, err, err.status || 500); }
};

export const submitAnswer = async (req, res) => {
  try { return ok(res, await service.submitAnswer(req.params.attemptId, req.body), 201); }
  catch (err) { return fail(res, err, err.status || 400); }
};

export const submitAttempt = async (req, res) => {
  try { return ok(res, await service.submitAttempt(req.params.attemptId, req.body.score)); }
  catch (err) { return fail(res, err, err.status || 400); }
};

export const getAttemptResults = async (req, res) => {
  try { return ok(res, await service.getAttemptResults(req.params.attemptId)); }
  catch (err) { return fail(res, err, err.status || 404); }
};
