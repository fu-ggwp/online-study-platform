import { fail, ok } from "../../utils/api-response.js";
import * as examsService from "./exams.service.js";

function getUserId(req) {
  return req.user?.id || req.user?.user_id;
}

function sendError(res, error) {
  const statusCode = error.statusCode || error.status || 500;

  return res.status(statusCode).json({
    ok: false,
    error: error.message || "Exam request failed.",
    fields: error.fields,
  });
}

function validateCreateRequest(body = {}) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return "Request body is required.";
  }

  const requiredFields = [
    "title",
    "class_id",
    "question_bank_id",
    "duration_minutes",
    "attempt_limit",
    "question_count",
  ];
  const missingFields = requiredFields.filter((field) => body[field] === undefined || body[field] === null || body[field] === "");

  if (missingFields.length > 0) {
    return `Missing required fields: ${missingFields.join(", ")}.`;
  }

  return null;
}

export async function listMine(req, res) {
  const data = await examsService.listMine(getUserId(req), req.query);
  return ok(res, data);
}

export async function create(req, res) {
  const validationError = validateCreateRequest(req.body);

  if (validationError) {
    return fail(res, validationError, 400);
  }

  try {
    const data = await examsService.createExamSession(getUserId(req), req.body);
    return ok(res, data, 201);
  } catch (error) {
    return sendError(res, error);
  }
}
