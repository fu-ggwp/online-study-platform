import { ok, fail } from "../../utils/api-response.js";
import * as service from "./payments.service.js";

export const listPlans = async (req, res) => {
  try {
    return ok(res, await service.listPlans(req));
  } catch (err) {
    return fail(res, err, err.status || 500);
  }
};
