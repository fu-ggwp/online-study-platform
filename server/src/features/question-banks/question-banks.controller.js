import * as service from "./question-banks.service.js";
import { ok, fail } from "../../utils/api-response.js";

export const listMine = async (req, res) => {
  try { return ok(res, await service.listMine(req.user.id)); }
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

export const listQuestions = async (req, res) => {
  try { return ok(res, await service.listQuestions(req.params.id)); }
  catch (err) { return fail(res, err, err.status || 500); }
};

export const addQuestion = async (req, res) => {
  try { return ok(res, await service.addQuestion(req.params.id, req.user.id, req.body), 201); }
  catch (err) { return fail(res, err, err.status || 400); }
};

export const updateQuestion = async (req, res) => {
  try { return ok(res, await service.updateQuestion(req.params.qid, req.body)); }
  catch (err) { return fail(res, err, err.status || 400); }
};
