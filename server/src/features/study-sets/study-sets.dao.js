import supabase from "../../config/supabase.js";
import { STUDY_SET_TABLE } from "../../models/study-set.model.js";
import { PRACTICE_SESSION_TABLE } from "../../models/practice-session.model.js";
import { LEARNER_ANSWER_TABLE } from "../../models/learner-answer.model.js";

export function findByOwner(ownerId) {
  return supabase.from(STUDY_SET_TABLE).select("*").eq("owner_id", ownerId);
}

export function findPublic({ classId } = {}) {
  let query = supabase.from(STUDY_SET_TABLE).select("*");
  if (classId) query = query.or(`visibility.eq.public,and(visibility.eq.class,class_id.eq.${classId})`);
  else query = query.eq("visibility", "public");
  return query;
}

export function findById(id) {
  return supabase.from(STUDY_SET_TABLE).select("*").eq("id", id).single();
}

export function create(payload) {
  return supabase.from(STUDY_SET_TABLE).insert(payload).select().single();
}

export function update(id, changes) {
  return supabase.from(STUDY_SET_TABLE).update(changes).eq("id", id).select().single();
}

export function remove(id) {
  return supabase.from(STUDY_SET_TABLE).delete().eq("id", id);
}

// Practice sessions
export function createSession(payload) {
  return supabase.from(PRACTICE_SESSION_TABLE).insert(payload).select().single();
}

export function findSessionById(id) {
  return supabase.from(PRACTICE_SESSION_TABLE).select("*").eq("id", id).single();
}

export function updateSession(id, changes) {
  return supabase.from(PRACTICE_SESSION_TABLE).update(changes).eq("id", id).select().single();
}

export function listSessionsByLearner(learnerId) {
  return supabase
    .from(PRACTICE_SESSION_TABLE)
    .select("*")
    .eq("learner_id", learnerId)
    .order("started_at", { ascending: false });
}

// Learner answers
export function recordAnswer(payload) {
  return supabase.from(LEARNER_ANSWER_TABLE).insert(payload).select().single();
}

export function listAnswersBySession(sessionId) {
  return supabase.from(LEARNER_ANSWER_TABLE).select("*").eq("practice_session_id", sessionId);
}
