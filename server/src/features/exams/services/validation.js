import {
  ExamResultVisibility,
  ExamSessionStatus,
  EXAM_SESSION_CONFIG_COLUMNS,
} from "../../../models/exam.model.js";
import {
  fail,
  nullableText,
  text,
  toBoolean,
  toIso,
  toPositiveInt,
} from "./utils.js";

function getNext(exam, changes, field) {
  return Object.prototype.hasOwnProperty.call(changes, field) ? changes[field] : exam[field];
}

export function assertTimeWindow(startAt, endAt) {
  if (startAt && endAt && new Date(endAt).getTime() <= new Date(startAt).getTime()) {
    throw fail("End time must be later than start time.", 400, {
      start_at: "End time must be later than start time.",
      end_at: "End time must be later than start time.",
    });
  }
}

export function assertStartNotPast(startAt, now = Date.now()) {
  if (!startAt) return;

  const startTime = new Date(startAt).getTime();
  if (Number.isFinite(startTime) && startTime < now) {
    throw fail("Start time cannot be in the past.", 400, {
      start_at: "Start time cannot be in the past.",
    });
  }
}

export function assertDurationFitsWindow(startAt, endAt, durationMinutes) {
  if (!startAt || !endAt || !durationMinutes) return;

  const startTime = new Date(startAt).getTime();
  const endTime = new Date(endAt).getTime();
  const durationMs = Number(durationMinutes || 0) * 60 * 1000;

  if (Number.isFinite(startTime) && Number.isFinite(endTime) && endTime <= startTime + durationMs) {
    throw fail("End time must be later than start time plus duration.", 400, {
      end_at: "End time must be later than start time plus duration.",
      duration_minutes: "Duration must fit within the exam window.",
    });
  }
}

export function assertActivatable(exam, changes) {
  const status = getNext(exam, changes, "status");
  if (status !== ExamSessionStatus.ACTIVE) return;

  const fields = {};
  if (!text(getNext(exam, changes, "title"))) fields.title = "Exam title is required.";
  if (!getNext(exam, changes, "class_id")) fields.class_id = "Class is required.";
  if (!getNext(exam, changes, "question_bank_id")) fields.question_bank_id = "Question bank is required.";
  if (!getNext(exam, changes, "start_at")) fields.start_at = "Start time is required before activating.";
  if (!getNext(exam, changes, "end_at")) fields.end_at = "End time is required before activating.";
  if (!toPositiveInt(getNext(exam, changes, "duration_minutes"))) fields.duration_minutes = "Duration is required.";
  if (!toPositiveInt(getNext(exam, changes, "attempt_limit"))) fields.attempt_limit = "Attempt limit is required.";
  if (!toPositiveInt(getNext(exam, changes, "question_count"))) fields.question_count = "Question count is required.";

  if (Object.keys(fields).length) {
    throw fail("The exam session cannot be activated. Please complete the required configuration.", 400, fields);
  }
}

export function normalizeStatus(value, fallback = ExamSessionStatus.DRAFT) {
  const rawStatus = text(value);
  if (!rawStatus) return fallback;

  const status = rawStatus.toLowerCase();
  return [ExamSessionStatus.DRAFT, ExamSessionStatus.ACTIVE].includes(status)
    ? status
    : ExamSessionStatus.DRAFT;
}

export function normalizeVisibility(value) {
  const visibility = text(value || ExamResultVisibility.SCORE_ONLY).toLowerCase();
  return Object.values(ExamResultVisibility).includes(visibility)
    ? visibility
    : ExamResultVisibility.SCORE_ONLY;
}

export function pickConfigChanges(payload = {}) {
  const changes = {};

  for (const field of EXAM_SESSION_CONFIG_COLUMNS) {
    if (payload[field] !== undefined) changes[field] = payload[field];
  }

  if (changes.title !== undefined) changes.title = text(changes.title);
  if (changes.description !== undefined) changes.description = nullableText(changes.description);
  if (changes.access_code !== undefined) changes.access_code = nullableText(changes.access_code);
  if (changes.start_at !== undefined) changes.start_at = toIso(changes.start_at);
  if (changes.end_at !== undefined) changes.end_at = toIso(changes.end_at);
  if (changes.duration_minutes !== undefined) changes.duration_minutes = toPositiveInt(changes.duration_minutes);
  if (changes.attempt_limit !== undefined) changes.attempt_limit = toPositiveInt(changes.attempt_limit);
  if (changes.question_count !== undefined) changes.question_count = toPositiveInt(changes.question_count);
  if (changes.randomize_questions !== undefined) changes.randomize_questions = toBoolean(changes.randomize_questions);
  if (changes.randomize_answers !== undefined) changes.randomize_answers = toBoolean(changes.randomize_answers);
  if (changes.result_visibility !== undefined) changes.result_visibility = normalizeVisibility(changes.result_visibility);
  if (changes.status !== undefined) changes.status = normalizeStatus(changes.status);

  return changes;
}

export function normalizeQuestionIds(value) {
  if (!Array.isArray(value)) return [];

  return Array.from(
    new Set(value.map((item) => text(item)).filter(Boolean))
  );
}

export function normalizeCreatePayload(payload = {}) {
  const questionIds = normalizeQuestionIds(payload.question_ids);
  const normalized = {
    class_id: text(payload.class_id),
    question_bank_id: text(payload.question_bank_id),
    title: text(payload.title),
    description: nullableText(payload.description),
    status: normalizeStatus(payload.status),
    start_at: toIso(payload.start_at),
    end_at: toIso(payload.end_at),
    duration_minutes: toPositiveInt(payload.duration_minutes),
    attempt_limit: toPositiveInt(payload.attempt_limit, 1),
    question_count: questionIds.length || toPositiveInt(payload.question_count),
    question_ids: questionIds,
    randomize_questions: toBoolean(payload.randomize_questions, true),
    randomize_answers: toBoolean(payload.randomize_answers, true),
    result_visibility: normalizeVisibility(payload.result_visibility),
    access_code: nullableText(payload.access_code),
  };

  const fields = {};
  if (!normalized.title) fields.title = "Exam title is required.";
  if (!normalized.class_id) fields.class_id = "Class is required.";
  if (!normalized.question_bank_id) fields.question_bank_id = "Question bank is required.";
  if (!normalized.duration_minutes) fields.duration_minutes = "Duration is required.";
  if (!normalized.attempt_limit) fields.attempt_limit = "Attempt limit is required.";
  if (!normalized.question_count) fields.question_count = "Question count is required.";
  if (normalized.status === ExamSessionStatus.ACTIVE && !normalized.start_at) fields.start_at = "Start time is required.";
  if (normalized.status === ExamSessionStatus.ACTIVE && !normalized.end_at) fields.end_at = "End time is required.";

  assertTimeWindow(normalized.start_at, normalized.end_at);
  assertStartNotPast(normalized.start_at);
  assertDurationFitsWindow(normalized.start_at, normalized.end_at, normalized.duration_minutes);
  if (Object.keys(fields).length) throw fail("The information is invalid. Please check and try again.", 400, fields);

  return normalized;
}

export { getNext };
