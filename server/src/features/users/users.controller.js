import * as service from "./users.service.js";
import { ok, fail } from "../../utils/api-response.js";

export const listPublic = async (req, res) => {
  try {
    return ok(res, await service.listPublic(req.query));
  } catch (err) {
    return fail(res, err, err.status || 500);
  }
};

export const getPublicProfile = async (req, res) => {
  try {
    return ok(res, await service.getPublicProfile(req.params.username));
  } catch (err) {
    return fail(res, err, err.status || 500);
  }
};

/**
 * GET /api/users
 * Admin user list with search + role/status/premium filters (UC-51 / §3.9.1).
 */
export const listAll = async (req, res) => {
  try {
    return ok(res, await service.listForAdmin(req.query));
  } catch (err) {
    return fail(res, err, err.status || 500);
  }
};

// GET /api/users/:id — admin user detail (UC-52 / §3.9.2)
export const getOne = async (req, res) => {
  try {
    return ok(res, await service.getForAdmin(req.params.id));
  } catch (err) {
    return fail(res, err, err.status || 500);
  }
};

// PATCH /api/users/:id/status — admin updates account status { status, reason? }
export const updateStatus = async (req, res) => {
  try {
    return ok(res, await service.updateAccountStatus(req.user.id, req.params.id, req.body));
  } catch (err) {
    return fail(res, err, err.status || 500);
  }
};
