import * as profilesService from "./profiles.service.js";
import { ok, fail } from "../../utils/api-response.js";

export async function getMine(req, res) {
  try {
    const profile = await profilesService.getById(req.user.id);
    return ok(res, profile);
  } catch (err) {
    return fail(res, err, err.status || 404);
  }
}

export async function getByUsername(req, res) {
  try {
    const profile = await profilesService.getByUsername(req.params.username);
    return ok(res, profile);
  } catch (err) {
    return fail(res, err, err.status || 404);
  }
}

export async function updateMine(req, res) {
  try {
    const profile = await profilesService.updateProfile(req.user.id, req.body);
    return ok(res, profile);
  } catch (err) {
    return fail(res, err, err.status || 400);
  }
}
