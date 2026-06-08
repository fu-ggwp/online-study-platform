import supabase from "../../config/supabase.js";
import { REPORT_TABLE } from "../../models/report.model.js";
import { EXAM_ATTEMPT_TABLE } from "../../models/exam-attempt.model.js";
import { PRACTICE_SESSION_TABLE } from "../../models/practice-session.model.js";

export function findReportsByOwner(ownerId) {
  return supabase
    .from(REPORT_TABLE)
    .select("*")
    .eq("owner_id", ownerId)
    .order("generated_at", { ascending: false });
}

export function findReportById(id) {
  return supabase.from(REPORT_TABLE).select("*").eq("id", id).single();
}

export function createReport(payload) {
  return supabase.from(REPORT_TABLE).insert(payload).select().single();
}

// Raw metrics used to compute reports
export function examAttemptsByClass(classId) {
  return supabase.from(EXAM_ATTEMPT_TABLE).select("*, exams!inner(class_id)").eq("exams.class_id", classId);
}

export function examAttemptsByLearner(learnerId) {
  return supabase.from(EXAM_ATTEMPT_TABLE).select("*, exams(*)").eq("learner_id", learnerId);
}

export function practiceSessionsByLearner(learnerId) {
  return supabase.from(PRACTICE_SESSION_TABLE).select("*").eq("learner_id", learnerId);
}
