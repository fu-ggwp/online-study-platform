import supabase from "../../config/supabase.js";
import { QUESTION_BANK_TABLE } from "../../models/question-bank.model.js";
import { QUESTION_TABLE } from "../../models/question.model.js";

export function findByTeacher(teacherId) {
  return supabase.from(QUESTION_BANK_TABLE).select("*").eq("teacher_id", teacherId);
}

export function findById(id) {
  return supabase.from(QUESTION_BANK_TABLE).select("*").eq("id", id).single();
}

export function create(payload) {
  return supabase.from(QUESTION_BANK_TABLE).insert(payload).select().single();
}

export function update(id, changes) {
  return supabase.from(QUESTION_BANK_TABLE).update(changes).eq("id", id).select().single();
}

export function remove(id) {
  return supabase.from(QUESTION_BANK_TABLE).delete().eq("id", id);
}

export function listQuestions(bankId) {
  return supabase
    .from(QUESTION_TABLE)
    .select("*, answer_options(*)")
    .eq("question_bank_id", bankId);
}

export function addQuestion(payload) {
  return supabase.from(QUESTION_TABLE).insert(payload).select().single();
}

export function updateQuestion(id, changes) {
  return supabase.from(QUESTION_TABLE).update(changes).eq("id", id).select().single();
}
