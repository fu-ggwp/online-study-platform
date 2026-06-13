import supabase, { supabaseAdmin } from "../../config/supabase.js";
import { CLASS_TABLE } from "../../models/class.model.js";
import { EXAM_QUESTION_TABLE, EXAM_SESSION_TABLE } from "../../models/exam.model.js";
import { QUESTION_TABLE } from "../../models/question.model.js";
import { QUESTION_BANK_TABLE } from "../../models/question-bank.model.js";

const db = supabaseAdmin ?? supabase;

const EXAM_SESSION_SELECT = `
  exam_session_id,
  class_id,
  teacher_id,
  question_bank_id,
  title,
  description,
  status,
  start_at,
  end_at,
  duration_minutes,
  attempt_limit,
  question_count,
  randomize_questions,
  randomize_answers,
  result_visibility,
  access_code,
  created_at,
  updated_at,
  classes:classes (
    class_id,
    class_name,
    subject,
    status
  ),
  question_bank:question_banks (
    question_bank_id,
    title,
    subject,
    topic
  )
`;

const SORTS = {
  latest: { column: "updated_at", ascending: false },
  start_asc: { column: "start_at", ascending: true },
  start_desc: { column: "start_at", ascending: false },
  title_asc: { column: "title", ascending: true },
};

function normalizePagination({ page = 1, pageSize = 10 } = {}) {
  const normalizedPage = Math.max(Number(page) || 1, 1);
  const normalizedPageSize = Math.min(Math.max(Number(pageSize) || 10, 1), 50);

  return { page: normalizedPage, pageSize: normalizedPageSize };
}

function includesText(value, term) {
  return String(value ?? "").toLowerCase().includes(term);
}

function filterExamSessions(items, filters) {
  const search = String(filters.search ?? "").trim().toLowerCase();
  const status = String(filters.status ?? "").trim();
  const classId = String(filters.classId ?? "").trim();
  const resultVisibility = String(filters.resultVisibility ?? "").trim();

  return items.filter((exam) => {
    const matchesSearch =
      !search ||
      includesText(exam.title, search) ||
      includesText(exam.description, search) ||
      includesText(exam.status, search) ||
      includesText(exam.classes?.class_name, search);

    const matchesStatus = !status || exam.status === status;
    const matchesClass = !classId || exam.class_id === classId;
    const matchesVisibility = !resultVisibility || exam.result_visibility === resultVisibility;

    return matchesSearch && matchesStatus && matchesClass && matchesVisibility;
  });
}

function sortExamSessions(items, sortBy) {
  if (sortBy === "title_asc") {
    return [...items].sort((left, right) => left.title.localeCompare(right.title));
  }

  if (sortBy === "start_asc" || sortBy === "start_desc") {
    const direction = sortBy === "start_asc" ? 1 : -1;

    return [...items].sort((left, right) => {
      const leftTime = left.start_at ? new Date(left.start_at).getTime() : Number.MAX_SAFE_INTEGER;
      const rightTime = right.start_at ? new Date(right.start_at).getTime() : Number.MAX_SAFE_INTEGER;
      return (leftTime - rightTime) * direction;
    });
  }

  return [...items].sort((left, right) => {
    const leftTime = left.updated_at ? new Date(left.updated_at).getTime() : 0;
    const rightTime = right.updated_at ? new Date(right.updated_at).getTime() : 0;
    return rightTime - leftTime;
  });
}

function buildClassOptions(items) {
  const classesById = new Map();

  items.forEach((exam) => {
    if (exam.classes?.class_id) {
      classesById.set(exam.classes.class_id, {
        class_id: exam.classes.class_id,
        class_name: exam.classes.class_name,
      });
    }
  });

  return Array.from(classesById.values()).sort((left, right) =>
    left.class_name.localeCompare(right.class_name)
  );
}

export async function listTeacherExamSessions(teacherId, filters = {}) {
  const { page, pageSize } = normalizePagination(filters);
  const sort = SORTS[filters.sortBy] ?? SORTS.latest;

  const { data, error } = await db
    .from(EXAM_SESSION_TABLE)
    .select(EXAM_SESSION_SELECT)
    .eq("teacher_id", teacherId)
    .is("deleted_at", null)
    .order(sort.column, { ascending: sort.ascending, nullsFirst: false })
    .limit(1000);

  if (error) {
    throw error;
  }

  const allItems = data ?? [];
  const filteredItems = sortExamSessions(filterExamSessions(allItems, filters), filters.sortBy);
  const total = filteredItems.length;
  const totalPages = Math.max(Math.ceil(total / pageSize), 1);
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const items = filteredItems.slice(start, start + pageSize);

  return {
    items,
    total,
    page: safePage,
    pageSize,
    totalPages,
    classes: buildClassOptions(allItems),
  };
}

export async function findManagedActiveClass(classId, teacherId) {
  const { data, error } = await db
    .from(CLASS_TABLE)
    .select("class_id, teacher_id, class_name, status")
    .eq("class_id", classId)
    .eq("teacher_id", teacherId)
    .eq("status", "active")
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function findOwnedQuestionBank(questionBankId, teacherId) {
  const { data, error } = await db
    .from(QUESTION_BANK_TABLE)
    .select("question_bank_id, teacher_id, title, status, subject, topic")
    .eq("question_bank_id", questionBankId)
    .eq("teacher_id", teacherId)
    .is("deleted_at", null)
    .neq("status", "archived")
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function listQuestionBankSourceQuestions(questionBankId) {
  const { data, error } = await db
    .from(QUESTION_TABLE)
    .select(`
      question_id,
      question_text,
      question_type,
      score,
      explanation,
      subject,
      topic,
      chapter,
      lesson,
      difficulty,
      answer_options:answer_options (
        answer_option_id,
        option_text,
        is_correct,
        display_order
      )
    `)
    .eq("question_bank_id", questionBankId)
    .is("study_set_id", null)
    .eq("status", "active")
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function insertExamSession(payload) {
  const { data, error } = await db
    .from(EXAM_SESSION_TABLE)
    .insert(payload)
    .select(EXAM_SESSION_SELECT)
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function insertExamQuestions(rows) {
  if (!rows.length) {
    return [];
  }

  const { data, error } = await db
    .from(EXAM_QUESTION_TABLE)
    .insert(rows)
    .select("*");

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function deleteExamSession(examSessionId) {
  const { error } = await db
    .from(EXAM_SESSION_TABLE)
    .delete()
    .eq("exam_session_id", examSessionId);

  if (error) {
    throw error;
  }
}
