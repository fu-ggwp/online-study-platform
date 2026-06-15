import supabase, { supabaseAdmin } from "../../config/supabase.js";
import { ANSWER_OPTION_TABLE } from "../../models/answer-option.model.js";
import { QUESTION_BANK_TABLE } from "../../models/question-bank.model.js";
import { QUESTION_TABLE } from "../../models/question.model.js";
import { getPagination } from "../../utils/pagination.js";

const db = supabaseAdmin || supabase;

const sortableColumns = new Set([
  "title",
  "topic",
  "status",
  "created_at",
  "updated_at",
]);

function cleanKeyword(value = "") {
  return String(value).trim().replace(/[,()]/g, " ").replace(/\s+/g, " ");
}

export function listByTeacher(teacherId, filters = {}) {
  const { page, limit, from, to } = getPagination(filters);
  const sortBy = sortableColumns.has(filters.sortBy)
    ? filters.sortBy
    : "updated_at";
  const ascending = filters.sortOrder === "asc";
  const keyword = cleanKeyword(filters.keyword);

  let query = db
    .from(QUESTION_BANK_TABLE)
    .select("*", { count: "exact" })
    .eq("teacher_id", teacherId)
    .neq("status", "Deleted");

  if (keyword) {
    query = query.or(
      `title.ilike.%${keyword}%,description.ilike.%${keyword}%,topic.ilike.%${keyword}%`,
    );
  }

  if (filters.status) query = query.eq("status", filters.status);

  return query
    .order(sortBy, { ascending })
    .range(from, to)
    .then((result) => ({
      ...result,
      page,
      limit,
    }));
}

export function findOwnedById(questionBankId, teacherId) {
  return db
    .from(QUESTION_BANK_TABLE)
    .select("*")
    .eq("question_bank_id", questionBankId)
    .eq("teacher_id", teacherId)
    .neq("status", "Deleted")
    .maybeSingle();
}

export function create(payload) {
  return db.from(QUESTION_BANK_TABLE).insert(payload).select("*").single();
}

export function update(questionBankId, teacherId, changes) {
  return db
    .from(QUESTION_BANK_TABLE)
    .update(changes)
    .eq("question_bank_id", questionBankId)
    .eq("teacher_id", teacherId)
    .neq("status", "Deleted")
    .select("*")
    .maybeSingle();
}

export function archive(questionBankId, teacherId) {
  const now = new Date().toISOString();

  return update(questionBankId, teacherId, {
    status: "Deleted",
    deleted_at: now,
    updated_at: now,
  });
}

export const softDelete = archive;

export async function countQuestions(questionBankId) {
  const { count, error } = await db
    .from(QUESTION_TABLE)
    .select("question_id", { count: "exact", head: true })
    .eq("question_bank_id", questionBankId)
    .is("deleted_at", null);

  if (error) throw error;
  return count || 0;
}

export function listQuestionsByBank(questionBankId, teacherId) {
  return db
    .from(QUESTION_TABLE)
    .select(`
      question_id,
      question_bank_id,
      study_set_id,
      source_question_id,
      owner_id,
      question_text,
      question_type,
      score,
      explanation,
      subject,
      topic,
      chapter,
      lesson,
      difficulty,
      status,
      created_at,
      updated_at,
      answer_options:${ANSWER_OPTION_TABLE} (
        answer_option_id,
        question_id,
        option_text,
        is_correct,
        display_order,
        created_at
      )
    `)
    .eq("question_bank_id", questionBankId)
    .eq("owner_id", teacherId)
    .is("study_set_id", null)
    .eq("status", "active")
    .is("deleted_at", null)
    .order("created_at", { ascending: true });
}
