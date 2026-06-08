import * as dao from "./exams.dao.js";
import { ExamAttemptStatus } from "../../models/exam-attempt.model.js";

function dbError(error, status = 400) {
  return Object.assign(new Error(error.message), { status });
}
function notFound(message = "Exam not found") {
  return Object.assign(new Error(message), { status: 404 });
}

export async function listMine(teacherId) {
  const { data, error } = await dao.findByTeacher(teacherId);
  if (error) throw dbError(error, 500);
  return data;
}

export async function listForClass(classId) {
  const { data, error } = await dao.findByClass(classId);
  if (error) throw dbError(error, 500);
  return data;
}

export async function getOne(id) {
  const { data, error } = await dao.findById(id);
  if (error || !data) throw notFound();
  return data;
}

export async function create(teacherId, payload) {
  if (!payload?.title?.trim()) throw Object.assign(new Error("Title is required"), { status: 422 });

  const { data, error } = await dao.create({
    teacher_id: teacherId,
    class_id: payload.classId,
    title: payload.title,
    duration_minutes: payload.durationMinutes,
    starts_at: payload.startsAt,
    ends_at: payload.endsAt,
    show_results_immediately: payload.showResultsImmediately ?? false,
  });
  if (error) throw dbError(error);
  return data;
}

export async function update(id, teacherId, changes) {
  const exam = await getOne(id);
  if (exam.teacher_id !== teacherId) throw Object.assign(new Error("Forbidden"), { status: 403 });

  const { data, error } = await dao.update(id, changes);
  if (error) throw dbError(error);
  return data;
}

export async function remove(id, teacherId) {
  const exam = await getOne(id);
  if (exam.teacher_id !== teacherId) throw Object.assign(new Error("Forbidden"), { status: 403 });

  const { error } = await dao.remove(id);
  if (error) throw dbError(error);
}

export async function listAttempts(examId, teacherId) {
  const exam = await getOne(examId);
  if (exam.teacher_id !== teacherId) throw Object.assign(new Error("Forbidden"), { status: 403 });

  const { data, error } = await dao.findAttemptsByExam(examId);
  if (error) throw dbError(error, 500);
  return data;
}

// Learner: take an exam
export async function startAttempt(examId, learnerId) {
  await getOne(examId);

  const { data, error } = await dao.createAttempt({
    exam_id: examId,
    learner_id: learnerId,
    status: ExamAttemptStatus.IN_PROGRESS,
    score: 0,
    started_at: new Date().toISOString(),
  });
  if (error) throw dbError(error);
  return data;
}

export async function listMyAttempts(learnerId) {
  const { data, error } = await dao.findAttemptsByLearner(learnerId);
  if (error) throw dbError(error, 500);
  return data;
}

export async function submitAnswer(attemptId, payload) {
  const { data, error } = await dao.recordAnswer({ ...payload, exam_attempt_id: attemptId });
  if (error) throw dbError(error);
  return data;
}

export async function submitAttempt(attemptId, score) {
  const { data, error } = await dao.updateAttempt(attemptId, {
    status: ExamAttemptStatus.SUBMITTED,
    score,
    submitted_at: new Date().toISOString(),
  });
  if (error) throw dbError(error);
  return data;
}

export async function getAttemptResults(attemptId) {
  const attempt = await dao.findAttemptById(attemptId);
  if (attempt.error || !attempt.data) throw notFound("Exam attempt not found");

  const { data, error } = await dao.listAnswersByAttempt(attemptId);
  if (error) throw dbError(error, 500);

  return { attempt: attempt.data, answers: data };
}
