import * as classesService from "./classes.service.js";
import { ok, fail } from "../../utils/api-response.js";
import { getPagination } from "../../utils/pagination.js";

// GET /api/classes — teacher views their created/managed classes
export async function listMine(req, res) {
  try {
    const pagination = getPagination(req.query);
    const result = await classesService.listMyClasses(req.user.id, pagination);
    return ok(res, result);
  } catch (err) {
    return fail(res, err, err.status || 500);
  }
}

export async function getOne(req, res) {
  try {
    const klass = await classesService.getClass(req.params.id, req.user?.id);
    return ok(res, klass);
  } catch (err) {
    return fail(res, err, err.status || 404);
  }
}

export async function create(req, res) {
  try {
    const klass = await classesService.createClass(req.user.id, req.body);
    return ok(res, klass, 201);
  } catch (err) {
    return fail(res, err, err.status || 400);
  }
}

export async function update(req, res) {
  try {
    const klass = await classesService.updateClass(req.params.id, req.user.id, req.body);
    return ok(res, klass);
  } catch (err) {
    return fail(res, err, err.status || 400);
  }
}

export async function remove(req, res) {
  try {
    await classesService.deleteClass(req.params.id, req.user.id);
    return ok(res, { message: "Class deleted" });
  } catch (err) {
    return fail(res, err, err.status || 400);
  }
}

export async function listMembers(req, res) {
  try {
    const members = await classesService.listMembers(req.params.id, req.user.id);
    return ok(res, members);
  } catch (err) {
    return fail(res, err, err.status || 403);
  }
}

export async function joinClass(req, res) {
  try {
    const request = await classesService.requestToJoin(req.params.id, req.user.id);
    return ok(res, request, 201);
  } catch (err) {
    return fail(res, err, err.status || 400);
  }
}

export async function resolveJoinRequest(req, res) {
  try {
    const result = await classesService.resolveJoinRequest(
      req.params.requestId,
      req.user.id,
      req.body.status
    );
    return ok(res, result);
  } catch (err) {
    return fail(res, err, err.status || 400);
  }
}
