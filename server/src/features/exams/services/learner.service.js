import * as dao from "../exams.dao.js";
import {
  attemptDurationSeconds,
  dbError,
  EXAM_MAX_SCORE,
  fail,
  notFound,
  requireUser,
  text,
} from "./utils.js";
import { withExamMaxScore } from "./presenter.js";

function filterLearnerExams(items, filters = {}) {
  const search = text(filters.search).toLowerCase();
  const classId = text(filters.classId);

  return items.filter((exam) => {
    const matchesSearch =
      !search ||
      text(exam.title).toLowerCase().includes(search) ||
      text(exam.description).toLowerCase().includes(search) ||
      text(exam.classes?.class_name).toLowerCase().includes(search) ||
      text(exam.classes?.class_code).toLowerCase().includes(search);

    return matchesSearch && (!classId || exam.class_id === classId);
  });
}

function sortLearnerExams(items, sortBy) {
  if (sortBy === "title_asc") return [...items].sort((a, b) => text(a.title).localeCompare(text(b.title)));
  if (sortBy === "start_asc" || sortBy === "start_desc") {
    const direction = sortBy === "start_asc" ? 1 : -1;
    return [...items].sort((a, b) => ((new Date(a.start_at).getTime() || 0) - (new Date(b.start_at).getTime() || 0)) * direction);
  }
  return [...items].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
}

function learnerClassOptions(items) {
  const classes = new Map();
  items.forEach((exam) => {
    if (exam.classes?.class_id) classes.set(exam.classes.class_id, exam.classes);
  });
  return Array.from(classes.values()).sort((a, b) => text(a.class_name).localeCompare(text(b.class_name)));
}

function paginateLearnerExams(items, filters = {}) {
  const page = Math.max(Number(filters.page) || 1, 1);
  const pageSize = Math.min(Math.max(Number(filters.pageSize) || 5, 1), 50);
  const filtered = sortLearnerExams(filterLearnerExams(items, filters), filters.sortBy);
  const total = filtered.length;
  const totalPages = Math.max(Math.ceil(total / pageSize), 1);
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;

  return {
    items: filtered.slice(start, start + pageSize),
    total,
    page: safePage,
    pageSize,
    totalPages,
    classes: learnerClassOptions(items),
  };
}

export async function getLearnerClassIds(learnerId) {
  const { data, error } = await dao.listActiveClassMemberships(learnerId);
  if (error) throw dbError(error, 500);
  return (data ?? []).map((item) => item.class_id).filter(Boolean);
}

export async function getLearnerExamOrFail(examSessionId, learnerId) {
  const classIds = await getLearnerClassIds(learnerId);
  const { data, error } = await dao.findLearnerExamSession(examSessionId, classIds);
  if (error) throw dbError(error, 500);
  if (!data) throw fail("This exam is not available to you at this time.", 403);
  return data;
}

export async function listLearnerExamSessions(learnerId, filters = {}) {
  requireUser(learnerId);

  const { data: memberships, error: memberError } = await dao.listActiveClassMemberships(learnerId);
  if (memberError) throw dbError(memberError, 500);

  const classIds = (memberships ?? []).map((item) => item.class_id).filter(Boolean);
  const { error: closeError } = await dao.closeExpiredLearnerExamSessions(
    classIds,
    new Date().toISOString()
  );
  if (closeError) throw dbError(closeError, 500);

  const { data, error } = await dao.listLearnerExamSessions(classIds);
  if (error) throw dbError(error, 500);

  return paginateLearnerExams(data ?? [], filters);
}

export async function getLearnerExamDetail(examSessionId, learnerId) {
  requireUser(learnerId);

  const { data: memberships, error: memberError } = await dao.listActiveClassMemberships(learnerId);
  if (memberError) throw dbError(memberError, 500);

  const classIds = (memberships ?? []).map((item) => item.class_id).filter(Boolean);
  const { error: closeError } = await dao.closeExpiredLearnerExamSessions(
    classIds,
    new Date().toISOString()
  );
  if (closeError) throw dbError(closeError, 500);

  const { data, error } = await dao.findLearnerExamSession(examSessionId, classIds);
  if (error) throw dbError(error, 500);
  if (!data) throw notFound();

  const { data: attempts, error: attemptError } = await dao.listLearnerExamAttempts(examSessionId, learnerId);
  if (attemptError) throw dbError(attemptError, 500);

  return {
    ...data,
    attempts: (attempts ?? []).map(withExamMaxScore),
    attempts_used: attempts?.length ?? 0,
    attempts_remaining: Math.max(Number(data.attempt_limit || 0) - (attempts?.length ?? 0), 0),
  };
}

function filterCompletedAttempts(items, filters = {}) {
  const search = text(filters.search).toLowerCase();
  const classId = text(filters.classId);

  return items.filter((attempt) => {
    const exam = attempt.exam_sessions ?? {};
    const className = exam.classes?.class_name ?? "";
    const classCode = exam.classes?.class_code ?? "";
    const matchesSearch =
      !search ||
      text(exam.title).toLowerCase().includes(search) ||
      text(className).toLowerCase().includes(search) ||
      text(classCode).toLowerCase().includes(search);

    return matchesSearch && (!classId || exam.class_id === classId);
  });
}

function sortCompletedAttempts(items, sortBy) {
  if (sortBy === "oldest_submitted") {
    return [...items].sort((a, b) => new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime());
  }
  if (sortBy === "score_desc") {
    return [...items].sort((a, b) => (b.total_score || 0) - (a.total_score || 0));
  }
  if (sortBy === "score_asc") {
    return [...items].sort((a, b) => (a.total_score || 0) - (b.total_score || 0));
  }
  if (sortBy === "title_asc") {
    return [...items].sort((a, b) => text(a.exam_sessions?.title).localeCompare(text(b.exam_sessions?.title)));
  }
  return [...items].sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime());
}

function paginateCompletedAttempts(items, filters = {}) {
  const page = Math.max(Number(filters.page) || 1, 1);
  const pageSize = Math.min(Math.max(Number(filters.pageSize) || 5, 1), 50);
  const filtered = sortCompletedAttempts(filterCompletedAttempts(items, filters), filters.sortBy);
  const total = filtered.length;
  const totalPages = Math.max(Math.ceil(total / pageSize), 1);
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;

  const classesMap = new Map();
  items.forEach((attempt) => {
    const examClass = attempt.exam_sessions?.classes;
    if (examClass?.class_id) {
      classesMap.set(examClass.class_id, examClass);
    }
  });
  const classes = Array.from(classesMap.values()).sort((a, b) => text(a.class_name).localeCompare(text(b.class_name)));

  return {
    items: filtered.slice(start, start + pageSize).map((attempt) => ({
      ...attempt,
      duration_seconds: attemptDurationSeconds(attempt),
      max_score: EXAM_MAX_SCORE,
    })),
    total,
    page: safePage,
    pageSize,
    totalPages,
    classes,
  };
}

export async function listLearnerCompletedAttempts(learnerId, filters = {}) {
  requireUser(learnerId);

  const { data, error } = await dao.listLearnerCompletedAttempts(learnerId);
  if (error) throw dbError(error, 500);

  return paginateCompletedAttempts(data ?? [], filters);
}
