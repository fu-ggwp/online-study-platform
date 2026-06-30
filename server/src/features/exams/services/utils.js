export const createSavedMessage = "Exam session has been created successfully.";
export const settingsSavedMessage = "Exam settings have been updated successfully.";
export const EXAM_MAX_SCORE = 10;

export function dbError(error, status = 400) {
  return Object.assign(new Error(error.message || "Database request failed"), { status });
}

export function fail(message, status = 400, fields) {
  return Object.assign(new Error(message), { status, statusCode: status, fields });
}

export function notFound(message = "Exam session not found") {
  return fail(message, 404);
}

export function requireUser(userId) {
  if (!userId) throw fail("Missing authenticated user.", 401);
}

export function text(value) {
  return value === undefined || value === null ? "" : String(value).trim();
}

export function nullableText(value) {
  return text(value) || null;
}

export function toIso(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function toPositiveInt(value, fallback = null) {
  const number = Number(value ?? fallback);
  return Number.isInteger(number) && number > 0 ? number : null;
}

export function toBoolean(value, fallback = false) {
  if (value === undefined || value === null) return fallback;
  if (value === "true") return true;
  if (value === "false") return false;
  return Boolean(value);
}

export function roundScore(value) {
  return Number(Number(value || 0).toFixed(2));
}

export function examQuestionScore(questionCount) {
  const count = Number(questionCount || 0);
  return count > 0 ? EXAM_MAX_SCORE / count : 0;
}

export function attemptDurationSeconds(attempt) {
  if (!attempt?.started_at || !attempt?.submitted_at) return null;

  const started = new Date(attempt.started_at).getTime();
  const submitted = new Date(attempt.submitted_at).getTime();
  if (!Number.isFinite(started) || !Number.isFinite(submitted) || submitted < started) return null;

  return Math.round((submitted - started) / 1000);
}

export function shuffle(items) {
  return [...items].sort(() => Math.random() - 0.5);
}
