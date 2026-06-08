import supabase from "../../config/supabase.js";
import { EXAM_TABLE } from "../../models/exam.model.js";
import { EXAM_ATTEMPT_TABLE } from "../../models/exam-attempt.model.js";
import { LEARNER_ANSWER_TABLE } from "../../models/learner-answer.model.js";

export function findByTeacher(teacherId) {
  return supabase.from(EXAM_TABLE).select("*").eq("teacher_id", teacherId);
}

export function findByClass(classId) {
  return supabase.from(EXAM_TABLE).select("*").eq("class_id", classId);
}

export function findById(id) {
  return supabase.from(EXAM_TABLE).select("*").eq("id", id).single();
}

export function create(payload) {
  return supabase.from(EXAM_TABLE).insert(payload).select().single();
}

export function update(id, changes) {
  return supabase.from(EXAM_TABLE).update(changes).eq("id", id).select().single();
}

export function remove(id) {
  return supabase.from(EXAM_TABLE).delete().eq("id", id);
}

// Attempts
export function createAttempt(payload) {
  return supabase.from(EXAM_ATTEMPT_TABLE).insert(payload).select().single();
}

export function findAttemptById(id) {
  return supabase.from(EXAM_ATTEMPT_TABLE).select("*").eq("id", id).single();
}

export function findAttemptsByExam(examId) {
  return supabase.from(EXAM_ATTEMPT_TABLE).select("*, profiles(*)").eq("exam_id", examId);
}

export function findAttemptsByLearner(learnerId) {
  return supabase
    .from(EXAM_ATTEMPT_TABLE)
    .select("*, exams(*)")
    .eq("learner_id", learnerId)
    .order("started_at", { ascending: false });
}

export function updateAttempt(id, changes) {
  return supabase.from(EXAM_ATTEMPT_TABLE).update(changes).eq("id", id).select().single();
}

// Answers within an attempt (reuses learner_answers, linked via practice_session_id-like FK)
export function recordAnswer(payload) {
  return supabase.from(LEARNER_ANSWER_TABLE).insert(payload).select().single();
}

export function listAnswersByAttempt(attemptId) {
  return supabase.from(LEARNER_ANSWER_TABLE).select("*").eq("exam_attempt_id", attemptId);
}
