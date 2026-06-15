import { randomBytes } from "crypto";

import supabase, { supabaseAdmin } from "../../config/supabase.js";
import {
  ExamResultVisibility,
  ExamSessionStatus,
  EXAM_SESSION_CONFIG_COLUMNS,
} from "../../models/exam.model.js";
import { createUserModel } from "../../models/user.model.js";
import {
  closeExpiredTeacherExamSessions,
  closeTeacherExamSession,
  countExamReadyQuestionsInBank,
  deleteExamSession,
  findManagedActiveClass,
  findOwnedQuestionBank,
  findTeacherExamSession,
  insertExamQuestions,
  insertExamSession,
  listQuestionBankSourceQuestions,
  listTeacherExamSessions as listTeacherExamSessionsDao,
  updateTeacherExamSessionConfig,
} from "./exams.dao.js";

const db = supabaseAdmin ?? supabase;
const userModel = createUserModel(db);

const createSavedMessage = "Exam session has been created successfully.";
const settingsSavedMessage = "Exam settings have been updated successfully.";
const invalidSettingsMessage = "The exam settings are invalid. Please check and try again.";
const invalidActivationMessage =
  "The exam session cannot be activated. Please complete the required configuration.";
const invalidInfoMessage = "The information is invalid. Please check and try again.";
const resultVisibilityValues = new Set(Object.values(ExamResultVisibility));
const allowedCreateStatuses = new Set([ExamSessionStatus.DRAFT, ExamSessionStatus.ACTIVE]);
const editableStatusValues = new Set([ExamSessionStatus.DRAFT, ExamSessionStatus.ACTIVE]);
const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function serviceError(message, statusCode = 400, fields) {
  const error = new Error(message);
  error.status = statusCode;
  error.statusCode = statusCode;
  error.fields = fields;
  return error;
}

function validationError(message, fields) {
  return serviceError(message, 400, fields);
}

function requireTeacherId(userId) {
  if (!userId) {
    throw serviceError("Missing authenticated user.", 401);
  }
}

async function requireActiveTeacher(userId) {
  requireTeacherId(userId);

  const profile = await userModel.findById(userId);

  if (!profile || profile.deleted_at) {
    throw serviceError("You do not have permission to access or perform this action.", 403);
  }

  if (profile.account_status !== "active" || profile.active_role !== "teacher") {
    throw serviceError("You do not have permission to access or perform this action.", 403);
  }

  return profile;
}

function normalizeText(value) {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

function normalizeNullableText(value) {
  const normalized = normalizeText(value);
  return normalized || null;
}

function ensureObjectPayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw validationError("Request body is required.", {
      body: "Request body is required.",
    });
  }
}

function validateExamSessionId(examSessionId) {
  if (!uuidRegex.test(String(examSessionId || ""))) {
    throw serviceError(invalidInfoMessage, 400, {
      id: "Exam session id is invalid.",
    });
  }
}

function ensureEditableExamSession(exam) {
  const now = Date.now();
  const startTime = exam.start_at ? new Date(exam.start_at).getTime() : null;
  const endTime = exam.end_at ? new Date(exam.end_at).getTime() : null;
  const statusLocked = [ExamSessionStatus.CLOSED, ExamSessionStatus.ARCHIVED].includes(
    exam.status
  );
  const timeLocked =
    (Number.isFinite(startTime) && startTime <= now) ||
    (Number.isFinite(endTime) && endTime <= now);

  if (statusLocked || timeLocked) {
    throw serviceError("You do not have permission to access or perform this action.", 409);
  }
}

function resolveNextValue(changes, field, fallback) {
  return Object.prototype.hasOwnProperty.call(changes, field) ? changes[field] : fallback;
}

function ensureValidTimeWindow(exam, changes) {
  const nextStartAt = resolveNextValue(changes, "start_at", exam.start_at);
  const nextEndAt = resolveNextValue(changes, "end_at", exam.end_at);

  if (!nextStartAt || !nextEndAt) {
    return;
  }

  if (new Date(nextEndAt).getTime() <= new Date(nextStartAt).getTime()) {
    throw serviceError(invalidSettingsMessage, 400, {
      start_at: "End time must be later than start time.",
      end_at: "End time must be later than start time.",
    });
  }
}

function normalizePositiveInteger(value, fieldName, errors) {
  if (value === undefined || value === null || value === "") {
    errors[fieldName] = "Please complete all required information.";
    return null;
  }

  const number = Number(value);

  if (!Number.isInteger(number) || number <= 0) {
    errors[fieldName] = "Please enter a positive whole number.";
    return null;
  }

  return number;
}

function normalizeOptionalDate(value, fieldName, errors) {
  const normalized = normalizeText(value);
  if (!normalized) return null;

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    errors[fieldName] = "Please enter a valid date and time.";
    return null;
  }

  return parsed.toISOString();
}

function normalizeStatus(value, errors) {
  const normalized = normalizeText(value || ExamSessionStatus.DRAFT).toLowerCase();

  if (!allowedCreateStatuses.has(normalized)) {
    errors.status = "Status must be draft or active.";
    return ExamSessionStatus.DRAFT;
  }

  return normalized;
}

function normalizeResultVisibility(value, errors) {
  const normalized = normalizeText(value || ExamResultVisibility.SCORE_ONLY).toLowerCase();

  if (!resultVisibilityValues.has(normalized)) {
    errors.result_visibility = "Result visibility is invalid.";
    return ExamResultVisibility.SCORE_ONLY;
  }

  return normalized;
}

function buildAccessCode(value) {
  const normalized = normalizeText(value).toUpperCase().replace(/[^A-Z0-9-]/g, "");
  return normalized || `EXAM-${randomBytes(4).toString("hex").toUpperCase()}`;
}

function isExpiredActiveExam(exam, now = Date.now()) {
  if (exam?.status !== ExamSessionStatus.ACTIVE || !exam.end_at) {
    return false;
  }

  const endTime = new Date(exam.end_at).getTime();
  return Number.isFinite(endTime) && endTime <= now;
}

function assertValidTimeWindow({ status, startAt, endAt, errors }) {
  if (status === ExamSessionStatus.ACTIVE && (!startAt || !endAt)) {
    errors.start_at = errors.start_at || "Start time is required before activating an exam.";
    errors.end_at = errors.end_at || "End time is required before activating an exam.";
    return;
  }

  if (!startAt && !endAt) return;

  if (!startAt || !endAt) {
    errors.start_at = errors.start_at || "Start and end time must be provided together.";
    errors.end_at = errors.end_at || "Start and end time must be provided together.";
    return;
  }

  const startTime = new Date(startAt).getTime();
  const endTime = new Date(endAt).getTime();

  if (endTime <= startTime) {
    errors.end_at = "End time must be later than start time.";
  }

  if (status === ExamSessionStatus.ACTIVE && startTime < Date.now()) {
    errors.start_at = "Start time cannot be in the past.";
  }
}

function addTextField(changes, errors, payload, field, { required = false, maxLength } = {}) {
  if (payload[field] === undefined) return;

  const value = payload[field] === null ? "" : String(payload[field]).trim();
  if (required && !value) {
    errors[field] = "Please complete all required information.";
    return;
  }

  if (maxLength && value.length > maxLength) {
    errors[field] = `Use ${maxLength} characters or fewer.`;
    return;
  }

  changes[field] = value || null;
}

function addPositiveIntegerField(changes, errors, payload, field) {
  if (payload[field] === undefined) return;

  const value = Number(payload[field]);
  if (!Number.isInteger(value) || value <= 0) {
    errors[field] = invalidInfoMessage;
    return;
  }

  changes[field] = value;
}

function addBooleanField(changes, errors, payload, field) {
  if (payload[field] === undefined) return;

  if (typeof payload[field] === "boolean") {
    changes[field] = payload[field];
    return;
  }

  if (payload[field] === "true" || payload[field] === "false") {
    changes[field] = payload[field] === "true";
    return;
  }

  errors[field] = invalidInfoMessage;
}

function addDateTimeField(changes, errors, payload, field) {
  if (payload[field] === undefined) return;

  if (payload[field] === null || payload[field] === "") {
    changes[field] = null;
    return;
  }

  const value = new Date(payload[field]);
  if (Number.isNaN(value.getTime())) {
    errors[field] = invalidInfoMessage;
    return;
  }

  changes[field] = value.toISOString();
}

function addResultVisibilityField(changes, errors, payload) {
  if (payload.result_visibility === undefined) return;

  const value = String(payload.result_visibility || "").trim();
  if (!resultVisibilityValues.has(value)) {
    errors.result_visibility = invalidInfoMessage;
    return;
  }

  changes.result_visibility = value;
}

function addStatusField(changes, errors, payload) {
  if (payload.status === undefined) return;

  const value = String(payload.status || "").trim();
  if (!editableStatusValues.has(value)) {
    errors.status = "Status can only be changed to draft or active before the exam starts.";
    return;
  }

  changes.status = value;
}

function validateSubmittedTimeWindow(changes, errors) {
  if (!changes.start_at || !changes.end_at) return;

  if (new Date(changes.end_at).getTime() <= new Date(changes.start_at).getTime()) {
    errors.start_at = invalidSettingsMessage;
    errors.end_at = invalidSettingsMessage;
  }
}

function buildExamSettingsChanges(payload = {}) {
  ensureObjectPayload(payload);

  const errors = {};
  const changes = {};

  addTextField(changes, errors, payload, "title", { required: true, maxLength: 255 });
  addTextField(changes, errors, payload, "description", { maxLength: 5000 });
  addTextField(changes, errors, payload, "access_code", { maxLength: 50 });
  addDateTimeField(changes, errors, payload, "start_at");
  addDateTimeField(changes, errors, payload, "end_at");
  addPositiveIntegerField(changes, errors, payload, "duration_minutes");
  addPositiveIntegerField(changes, errors, payload, "attempt_limit");
  addPositiveIntegerField(changes, errors, payload, "question_count");
  addBooleanField(changes, errors, payload, "randomize_questions");
  addBooleanField(changes, errors, payload, "randomize_answers");
  addResultVisibilityField(changes, errors, payload);
  addStatusField(changes, errors, payload);
  validateSubmittedTimeWindow(changes, errors);

  if (Object.keys(errors).length > 0) {
    const message = errors.start_at || errors.end_at ? invalidSettingsMessage : invalidInfoMessage;
    throw validationError(message, errors);
  }

  return changes;
}

function getNextValue(exam, changes, field) {
  return resolveNextValue(changes, field, exam[field]);
}

function isPositiveInteger(value) {
  return Number.isInteger(Number(value)) && Number(value) > 0;
}

function ensureActivatableExamSession(exam, changes) {
  const nextStatus = getNextValue(exam, changes, "status");
  if (nextStatus !== ExamSessionStatus.ACTIVE) {
    return;
  }

  const errors = {};
  const nextTitle = String(getNextValue(exam, changes, "title") || "").trim();
  const nextStartAt = getNextValue(exam, changes, "start_at");
  const nextEndAt = getNextValue(exam, changes, "end_at");
  const nextDuration = getNextValue(exam, changes, "duration_minutes");
  const nextAttemptLimit = getNextValue(exam, changes, "attempt_limit");
  const nextQuestionCount = getNextValue(exam, changes, "question_count");
  const nextVisibility = getNextValue(exam, changes, "result_visibility");

  if (!exam.class_id) errors.class_id = "Please select a class before activating.";
  if (!exam.question_bank_id) {
    errors.question_bank_id = "Please select a question bank before activating.";
  }
  if (!nextTitle) errors.title = "Please complete all required information.";
  if (!nextStartAt) errors.start_at = "Start time is required before activating.";
  if (!nextEndAt) errors.end_at = "End time is required before activating.";
  if (!isPositiveInteger(nextDuration)) errors.duration_minutes = invalidInfoMessage;
  if (!isPositiveInteger(nextAttemptLimit)) errors.attempt_limit = invalidInfoMessage;
  if (!isPositiveInteger(nextQuestionCount)) errors.question_count = invalidInfoMessage;
  if (!resultVisibilityValues.has(nextVisibility)) errors.result_visibility = invalidInfoMessage;

  if (nextStartAt && nextEndAt) {
    const startTime = new Date(nextStartAt).getTime();
    const endTime = new Date(nextEndAt).getTime();

    if (Number.isNaN(startTime) || Number.isNaN(endTime) || endTime <= startTime) {
      errors.start_at = "End time must be later than start time.";
      errors.end_at = "End time must be later than start time.";
    }
  }

  if (Object.keys(errors).length > 0) {
    throw validationError(invalidActivationMessage, errors);
  }
}

function normalizeConfigChanges(changes = {}) {
  return Object.fromEntries(
    Object.entries(changes).filter(([field, value]) =>
      EXAM_SESSION_CONFIG_COLUMNS.includes(field) && value !== undefined
    )
  );
}

function handleDaoError(error) {
  if (error) {
    throw serviceError("Failed to load data. Please check your connection and try again.", 500);
  }
}

function validateSourceQuestion(question) {
  const options = [...(question.answer_options ?? [])].sort(
    (left, right) => left.display_order - right.display_order
  );
  const correctCount = options.filter((option) => option.is_correct).length;

  if (question.question_type === "multiple_choice") {
    return options.length >= 2 && correctCount >= 1;
  }

  if (question.question_type === "true_false") {
    return options.length === 2 && correctCount === 1;
  }

  return false;
}

function shuffleItems(items) {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
}

function getOrderedAnswerOptions(question, shouldRandomizeAnswers) {
  const orderedOptions = [...(question.answer_options ?? [])].sort(
    (left, right) => left.display_order - right.display_order
  );

  return shouldRandomizeAnswers ? shuffleItems(orderedOptions) : orderedOptions;
}

function toExamQuestionRows(examSessionId, sourceQuestions, shouldRandomizeAnswers) {
  return sourceQuestions.map((question, index) => {
    const orderedOptions = getOrderedAnswerOptions(question, shouldRandomizeAnswers);
    const answerOptions = orderedOptions.map((option, optionIndex) => ({
      index: optionIndex,
      text: option.option_text,
    }));

    const correctOptionIndexes = orderedOptions
      .map((option, optionIndex) => (option.is_correct ? optionIndex : null))
      .filter((optionIndex) => optionIndex !== null);

    return {
      exam_session_id: examSessionId,
      source_question_id: question.question_id,
      question_text: question.question_text,
      question_type: question.question_type,
      score: question.score,
      explanation: question.explanation || null,
      subject: question.subject || null,
      topic: question.topic || null,
      chapter: question.chapter || null,
      lesson: null,
      difficulty: null,
      answer_options_json: answerOptions,
      correct_option_indexes: correctOptionIndexes,
      display_order: index + 1,
    };
  });
}

function selectSourceQuestions(questions, requestedCount, shouldRandomize) {
  const candidates = shouldRandomize ? shuffleItems(questions) : questions;
  return candidates.slice(0, requestedCount);
}

function normalizeCreatePayload(payload = {}) {
  ensureObjectPayload(payload);

  const errors = {};
  const title = normalizeText(payload.title);
  const classId = normalizeText(payload.class_id);
  const questionBankId = normalizeText(payload.question_bank_id);
  const status = normalizeStatus(payload.status, errors);
  const startAt = normalizeOptionalDate(payload.start_at, "start_at", errors);
  const endAt = normalizeOptionalDate(payload.end_at, "end_at", errors);
  const durationMinutes = normalizePositiveInteger(
    payload.duration_minutes,
    "duration_minutes",
    errors
  );
  const attemptLimit = normalizePositiveInteger(payload.attempt_limit ?? 1, "attempt_limit", errors);
  const questionCount = normalizePositiveInteger(payload.question_count, "question_count", errors);
  const resultVisibility = normalizeResultVisibility(payload.result_visibility, errors);

  if (!title) errors.title = "Exam title is required.";
  if (!classId) errors.class_id = "Class is required.";
  if (!questionBankId) errors.question_bank_id = "Question bank is required.";

  assertValidTimeWindow({ status, startAt, endAt, errors });

  if (Object.keys(errors).length > 0) {
    throw validationError(invalidInfoMessage, errors);
  }

  return {
    class_id: classId,
    question_bank_id: questionBankId,
    title,
    description: normalizeNullableText(payload.description),
    status,
    start_at: startAt,
    end_at: endAt,
    duration_minutes: durationMinutes,
    attempt_limit: attemptLimit,
    question_count: questionCount,
    randomize_questions:
      payload.randomize_questions === undefined ? true : Boolean(payload.randomize_questions),
    randomize_answers:
      payload.randomize_answers === undefined ? true : Boolean(payload.randomize_answers),
    result_visibility: resultVisibility,
    access_code: normalizeNullableText(payload.access_code),
  };
}

/**
 * Return all exam sessions owned by the teacher.
 */
export async function listTeacherExamSessions(teacherId, filters = {}) {
  requireTeacherId(teacherId);

  const nowIso = new Date().toISOString();
  const { error: closeError } = await closeExpiredTeacherExamSessions(teacherId, nowIso);
  handleDaoError(closeError);

  const { data, error } = await listTeacherExamSessionsDao(teacherId, filters);
  handleDaoError(error);

  return data;
}

/**
 * Get a single exam session, asserting the requester is the owner.
 */
export async function getExamDetail(examSessionId, teacherId) {
  requireTeacherId(teacherId);
  validateExamSessionId(examSessionId);

  const { data, error } = await findTeacherExamSession(examSessionId, teacherId);
  handleDaoError(error);

  if (!data) {
    throw serviceError("Exam session not found.", 404);
  }

  if (isExpiredActiveExam(data)) {
    const { data: closedExam, error: closeError } = await closeTeacherExamSession(
      examSessionId,
      teacherId,
      new Date().toISOString()
    );
    handleDaoError(closeError);
    return closedExam ?? { ...data, status: ExamSessionStatus.CLOSED };
  }

  return data;
}

/**
 * Update configurable exam settings before the exam starts.
 */
export async function updateExamSettings(examSessionId, teacherId, payload = {}) {
  const exam = await getExamDetail(examSessionId, teacherId);
  ensureEditableExamSession(exam);

  const normalizedChanges = normalizeConfigChanges(buildExamSettingsChanges(payload));
  if (Object.keys(normalizedChanges).length === 0) {
    throw serviceError("No valid exam settings were provided.", 400);
  }

  ensureValidTimeWindow(exam, normalizedChanges);
  ensureActivatableExamSession(exam, normalizedChanges);

  const isActivating =
    normalizedChanges.status === ExamSessionStatus.ACTIVE &&
    exam.status !== ExamSessionStatus.ACTIVE;
  if (isActivating && !normalizeText(getNextValue(exam, normalizedChanges, "access_code"))) {
    normalizedChanges.access_code = buildAccessCode();
  }

  if (normalizedChanges.question_count !== undefined || isActivating) {
    const { count: availableCount, error } = await countExamReadyQuestionsInBank(
      exam.question_bank_id,
      teacherId
    );
    handleDaoError(error);

    const nextQuestionCount = Number(getNextValue(exam, normalizedChanges, "question_count"));
    if (nextQuestionCount > availableCount) {
      throw serviceError(isActivating ? invalidActivationMessage : invalidSettingsMessage, 400, {
        question_count: `Only ${availableCount} valid questions are available in the selected question bank.`,
      });
    }
  }

  const { data, error } = await updateTeacherExamSessionConfig(examSessionId, teacherId, {
    ...normalizedChanges,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    throw serviceError(error.message || invalidInfoMessage, 400);
  }

  if (!data) {
    throw serviceError("Exam session not found.", 404);
  }

  return { message: settingsSavedMessage, exam: data };
}

export async function createExamSession(teacherId, payload = {}) {
  await requireActiveTeacher(teacherId);

  const normalized = normalizeCreatePayload(payload);
  const [classResult, bankResult] = await Promise.all([
    findManagedActiveClass(normalized.class_id, teacherId),
    findOwnedQuestionBank(normalized.question_bank_id, teacherId),
  ]);
  handleDaoError(classResult.error);
  handleDaoError(bankResult.error);

  const errors = {};

  if (!classResult.data) {
    errors.class_id = "Select one of your active classes.";
  }

  if (!bankResult.data) {
    errors.question_bank_id = "Select one of your available question banks.";
  }

  if (Object.keys(errors).length > 0) {
    throw validationError(invalidInfoMessage, errors);
  }

  const { count: availableCount, error: countError } = await countExamReadyQuestionsInBank(
    normalized.question_bank_id,
    teacherId
  );
  handleDaoError(countError);

  if (availableCount === 0) {
    errors.question_bank_id = "The selected question bank does not contain valid active questions.";
  }

  if (normalized.question_count > availableCount) {
    errors.question_count = `Only ${availableCount} valid questions are available in this question bank.`;
  }

  if (Object.keys(errors).length > 0) {
    throw validationError(
      normalized.status === ExamSessionStatus.ACTIVE ? invalidActivationMessage : invalidInfoMessage,
      errors
    );
  }

  const { data: sourceQuestionsData, error: sourceQuestionsError } =
    await listQuestionBankSourceQuestions(normalized.question_bank_id);
  handleDaoError(sourceQuestionsError);

  const sourceQuestions = sourceQuestionsData ?? [];
  const validQuestions = sourceQuestions.filter(validateSourceQuestion);

  if (normalized.question_count > validQuestions.length) {
    errors.question_count = `Only ${validQuestions.length} valid questions are available in this question bank.`;
  }

  if (Object.keys(errors).length > 0) {
    throw validationError(
      normalized.status === ExamSessionStatus.ACTIVE ? invalidActivationMessage : invalidInfoMessage,
      errors
    );
  }

  const shouldCreateAccessCode = normalized.access_code || normalized.status === ExamSessionStatus.ACTIVE;
  const accessCode = shouldCreateAccessCode ? buildAccessCode(normalized.access_code) : null;

  const { data: examSession, error: examSessionError } = await insertExamSession({
    ...normalized,
    access_code: accessCode,
    teacher_id: teacherId,
  });

  if (examSessionError) {
    throw serviceError(examSessionError.message || invalidInfoMessage, 400);
  }

  try {
    const selectedQuestions = selectSourceQuestions(
      validQuestions,
      normalized.question_count,
      normalized.randomize_questions
    );
    const { data: examQuestions, error: examQuestionsError } = await insertExamQuestions(
      toExamQuestionRows(examSession.exam_session_id, selectedQuestions, normalized.randomize_answers)
    );

    if (examQuestionsError) {
      throw serviceError(examQuestionsError.message || invalidInfoMessage, 400);
    }

    return {
      ...examSession,
      message: createSavedMessage,
      question_bank: bankResult.data,
      classes: classResult.data,
      exam_questions_count: examQuestions?.length ?? 0,
    };
  } catch (error) {
    await deleteExamSession(examSession.exam_session_id);
    throw error;
  }
}
