import { ExamResultVisibility } from "../../../models/exam.model.js";
import { ExamAttemptStatus } from "../../../models/exam-attempt.model.js";
import * as dao from "../exams.dao.js";
import { getExamDetail } from "./teacher.service.js";
import { getLearnerExamOrFail } from "./learner.service.js";
import {
  dbError,
  EXAM_MAX_SCORE,
  examQuestionScore,
  fail,
  notFound,
  requireUser,
  roundScore,
  shuffle,
  text,
} from "./utils.js";
import {
  resultQuestions,
  visibleQuestions,
  withExamMaxScore,
  withTeacherAttemptPresentation,
} from "./presenter.js";

function nowMs() {
  return Date.now();
}

function isWithinExamWindow(exam, now = nowMs()) {
  const start = exam.start_at ? new Date(exam.start_at).getTime() : null;
  const end = exam.end_at ? new Date(exam.end_at).getTime() : null;
  return (!start || start <= now) && (!end || now <= end);
}

function expiresAtForAttempt(exam, startedAt) {
  const started = new Date(startedAt).getTime();
  const durationEnd = started + Number(exam.duration_minutes || 0) * 60 * 1000;
  const sessionEnd = exam.end_at ? new Date(exam.end_at).getTime() : durationEnd;
  return new Date(Math.min(durationEnd, sessionEnd)).toISOString();
}

function remainingSeconds(attempt) {
  const expires = new Date(attempt.expires_at).getTime();
  if (!Number.isFinite(expires)) return 0;
  return Math.max(Math.ceil((expires - nowMs()) / 1000), 0);
}

function sameIndexes(left = [], right = []) {
  if (left.length !== right.length) return false;
  const sortedLeft = [...left].map(Number).sort((a, b) => a - b);
  const sortedRight = [...right].map(Number).sort((a, b) => a - b);
  return sortedLeft.every((value, index) => value === sortedRight[index]);
}

function buildAttemptOrder(exam, questions) {
  const orderedQuestions = exam.randomize_questions ? shuffle(questions) : [...questions];
  const questionOrder = orderedQuestions.map((question) => question.exam_question_id);
  const answerOrder = {};

  questions.forEach((question) => {
    const options = Array.isArray(question.answer_options_json) ? question.answer_options_json : [];
    const indexes = options.map((option, index) => Number(option.index ?? index));
    answerOrder[question.exam_question_id] = exam.randomize_answers ? shuffle(indexes) : indexes;
  });

  return { questionOrder, answerOrder };
}

async function buildAttemptPayload(attempt, exam) {
  const { data: questions, error: questionError } = await dao.listExamQuestions(attempt.exam_session_id);
  if (questionError) throw dbError(questionError, 500);

  const { data: answers, error: answerError } = await dao.listExamAttemptAnswers(attempt.exam_attempt_id);
  if (answerError) throw dbError(answerError, 500);

  return {
    exam,
    attempt: {
      ...attempt,
      max_score: EXAM_MAX_SCORE,
      remaining_seconds: remainingSeconds(attempt),
    },
    questions: visibleQuestions(questions ?? [], attempt),
    answers: answers ?? [],
  };
}

async function autoSubmitIfExpired(attempt, exam) {
  if (attempt.status !== ExamAttemptStatus.IN_PROGRESS || remainingSeconds(attempt) > 0) return attempt;
  return submitLearnerExamAttempt(attempt.exam_attempt_id, attempt.learner_id, true, exam);
}

export async function startLearnerExamAttempt(examSessionId, learnerId, payload = {}) {
  requireUser(learnerId);
  const exam = await getLearnerExamOrFail(examSessionId, learnerId);

  if (!isWithinExamWindow(exam)) throw fail("This exam is not available to you at this time.", 403);
  if (exam.access_code && text(payload.access_code).toUpperCase() !== exam.access_code.toUpperCase()) {
    throw fail("The exam access code is invalid.", 403);
  }

  const { data: existingAttempt, error: existingError } = await dao.findInProgressExamAttempt(examSessionId, learnerId);
  if (existingError) throw dbError(existingError, 500);
  if (existingAttempt) {
    const current = await autoSubmitIfExpired(existingAttempt, exam);
    if (current.status === ExamAttemptStatus.IN_PROGRESS) return buildAttemptPayload(current, exam);
  }

  const { data: attempts, error: attemptError } = await dao.listLearnerExamAttempts(examSessionId, learnerId);
  if (attemptError) throw dbError(attemptError, 500);
  if ((attempts?.length ?? 0) >= Number(exam.attempt_limit || 1)) {
    throw fail("This exam is not available to you at this time.", 403);
  }

  const { data: questions, error: questionError } = await dao.listExamQuestions(examSessionId);
  if (questionError) throw dbError(questionError, 500);
  if (!questions?.length) throw fail("No exam questions are available.", 400);

  const startedAt = new Date().toISOString();
  const { questionOrder, answerOrder } = buildAttemptOrder(exam, questions);
  const { data: attempt, error } = await dao.insertExamAttempt({
    exam_session_id: examSessionId,
    learner_id: learnerId,
    attempt_number: (attempts?.length ?? 0) + 1,
    started_at: startedAt,
    expires_at: expiresAtForAttempt(exam, startedAt),
    status: ExamAttemptStatus.IN_PROGRESS,
    is_auto_submitted: false,
    question_order: questionOrder,
    answer_order: answerOrder,
    warning_count: 0,
    total_score: 0,
  });
  if (error) throw dbError(error);

  return buildAttemptPayload(attempt, exam);
}

export async function getLearnerExamAttempt(examAttemptId, learnerId) {
  requireUser(learnerId);
  const { data: attempt, error } = await dao.findLearnerExamAttempt(examAttemptId, learnerId);
  if (error) throw dbError(error, 500);
  if (!attempt) throw notFound("Exam attempt not found");

  const exam = await getLearnerExamOrFail(attempt.exam_session_id, learnerId);
  const current = await autoSubmitIfExpired(attempt, exam);
  return buildAttemptPayload(current, exam);
}

export async function saveLearnerExamAnswer(examAttemptId, learnerId, payload = {}) {
  requireUser(learnerId);
  const { data: attempt, error } = await dao.findLearnerExamAttempt(examAttemptId, learnerId);
  if (error) throw dbError(error, 500);
  if (!attempt) throw notFound("Exam attempt not found");
  if (attempt.status !== ExamAttemptStatus.IN_PROGRESS) throw fail("This attempt has already been submitted.", 409);
  if (remainingSeconds(attempt) <= 0) throw fail("Time is up.", 409);

  const { data: questions, error: questionError } = await dao.listExamQuestions(attempt.exam_session_id);
  if (questionError) throw dbError(questionError, 500);
  const question = (questions ?? []).find((item) => item.exam_question_id === payload.exam_question_id);
  if (!question) throw fail("Question is not part of this attempt.", 400);

  const selected = Array.isArray(payload.selected_exam_option_indexes)
    ? payload.selected_exam_option_indexes.map(Number).filter(Number.isFinite)
    : [];
  const isCorrect = sameIndexes(selected, question.correct_option_indexes ?? []);
  const scoreAwarded = isCorrect ? examQuestionScore(questions.length) : 0;
  const { data, error: answerError } = await dao.upsertExamAttemptAnswer({
    exam_attempt_id: examAttemptId,
    exam_question_id: question.exam_question_id,
    selected_exam_option_indexes: selected,
    is_correct: isCorrect,
    score_awarded: scoreAwarded,
    review_status: "unreviewed",
    answered_at: new Date().toISOString(),
  });
  if (answerError) throw dbError(answerError);
  return data;
}

export async function submitLearnerExamAttempt(examAttemptId, learnerId, auto = false, knownExam = null) {
  requireUser(learnerId);
  const { data: attempt, error } = await dao.findLearnerExamAttempt(examAttemptId, learnerId);
  if (error) throw dbError(error, 500);
  if (!attempt) throw notFound("Exam attempt not found");
  const exam = knownExam || await getLearnerExamOrFail(attempt.exam_session_id, learnerId);
  if (attempt.status === ExamAttemptStatus.SUBMITTED) {
    return { ...withExamMaxScore(attempt), result_visibility: exam.result_visibility };
  }
  const { data: answers, error: answerError } = await dao.listExamAttemptAnswers(examAttemptId);
  if (answerError) throw dbError(answerError, 500);

  const { data: questions, error: questionError } = await dao.listExamQuestions(attempt.exam_session_id);
  if (questionError) throw dbError(questionError, 500);

  const questionScore = examQuestionScore(questions?.length ?? 0);
  const totalScore = roundScore((answers ?? []).reduce(
    (sum, answer) => sum + (answer.is_correct ? questionScore : 0),
    0
  ));

  const { data, error: updateError } = await dao.updateExamAttempt(examAttemptId, {
    status: ExamAttemptStatus.SUBMITTED,
    is_auto_submitted: Boolean(auto),
    submitted_at: new Date().toISOString(),
    total_score: totalScore,
    updated_at: new Date().toISOString(),
  });
  if (updateError) throw dbError(updateError);

  return {
    ...data,
    max_score: EXAM_MAX_SCORE,
    result_visibility: exam.result_visibility,
  };
}

export async function getLearnerExamAttemptResults(examAttemptId, learnerId) {
  requireUser(learnerId);

  const { data: attempt, error: attemptError } = await dao.findLearnerExamAttempt(examAttemptId, learnerId);
  if (attemptError) throw dbError(attemptError, 500);
  if (!attempt) throw notFound("Exam attempt not found");
  if (attempt.status !== ExamAttemptStatus.SUBMITTED) {
    throw fail("Submit this exam before viewing detailed results.", 409);
  }

  const { data: exam, error: examError } = await dao.findExamSessionById(attempt.exam_session_id);
  if (examError) throw dbError(examError, 500);
  if (!exam) throw notFound("Exam session not found");
  if (exam.result_visibility !== ExamResultVisibility.QUESTION_ANSWER) {
    throw fail("Detailed question answers are not available for this exam.", 403);
  }

  const { data: questions, error: questionError } = await dao.listExamQuestions(attempt.exam_session_id);
  if (questionError) throw dbError(questionError, 500);

  const { data: answers, error: answerError } = await dao.listExamAttemptAnswers(examAttemptId);
  if (answerError) throw dbError(answerError, 500);

  return {
    exam,
    attempt: withExamMaxScore(attempt),
    questions: resultQuestions(questions ?? [], answers ?? [], attempt),
  };
}

export async function getTeacherExamAttemptResults(examAttemptId, teacherId) {
  requireUser(teacherId);

  const { data: attempt, error: attemptError } = await dao.findExamAttemptById(examAttemptId);
  if (attemptError) throw dbError(attemptError, 500);
  if (!attempt) throw notFound("Exam attempt not found");

  const exam = await getExamDetail(attempt.exam_session_id, teacherId);

  if (attempt.status !== ExamAttemptStatus.SUBMITTED) {
    return {
      exam,
      attempt: withTeacherAttemptPresentation(attempt),
      learner: attempt.learner ?? null,
      questions: [],
      review_available: false,
      message: "Question review is available after the attempt is submitted.",
    };
  }

  const { data: questions, error: questionError } = await dao.listExamQuestions(attempt.exam_session_id);
  if (questionError) throw dbError(questionError, 500);

  const { data: answers, error: answerError } = await dao.listExamAttemptAnswers(examAttemptId);
  if (answerError) throw dbError(answerError, 500);

  return {
    exam,
    attempt: withTeacherAttemptPresentation(attempt),
    learner: attempt.learner ?? null,
    questions: resultQuestions(questions ?? [], answers ?? [], attempt),
    review_available: true,
  };
}

export async function recordLearnerExamEvent(examAttemptId, learnerId, payload = {}) {
  requireUser(learnerId);
  const eventType = text(payload.event_type);
  const eventTypes = new Set(["tab_hidden", "tab_visible", "window_blur", "window_focus", "fullscreen_exit", "zoom_changed"]);
  const warningTypes = new Set(["tab_hidden", "window_blur", "fullscreen_exit", "zoom_changed"]);
  if (!eventTypes.has(eventType)) throw fail("Invalid exam event type.", 400);

  const { data: attempt, error } = await dao.findLearnerExamAttempt(examAttemptId, learnerId);
  if (error) throw dbError(error, 500);
  if (!attempt) throw notFound("Exam attempt not found");
  if (attempt.status !== ExamAttemptStatus.IN_PROGRESS) return attempt;

  if (!warningTypes.has(eventType)) return attempt;

  const { data, error: updateError } = await dao.updateExamAttempt(examAttemptId, {
    warning_count: Number(attempt.warning_count || 0) + 1,
    updated_at: new Date().toISOString(),
  });
  if (updateError) throw dbError(updateError);
  return data;
}
