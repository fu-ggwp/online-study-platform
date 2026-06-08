import supabase from "../../config/supabase.js";
import { CLASS_TABLE } from "../../models/class.model.js";
import { JOIN_REQUEST_TABLE } from "../../models/join-request.model.js";

export function findByTeacher(teacherId, { from, to } = {}) {
  let query = supabase
    .from(CLASS_TABLE)
    .select("*", { count: "exact" })
    .eq("teacher_id", teacherId)
    .order("created_at", { ascending: false });

  if (from !== undefined && to !== undefined) query = query.range(from, to);
  return query;
}

export function findById(id) {
  return supabase.from(CLASS_TABLE).select("*").eq("id", id).single();
}

export function create(payload) {
  return supabase.from(CLASS_TABLE).insert(payload).select().single();
}

export function update(id, changes) {
  return supabase.from(CLASS_TABLE).update(changes).eq("id", id).select().single();
}

export function remove(id) {
  return supabase.from(CLASS_TABLE).delete().eq("id", id);
}

export function listMembers(classId) {
  return supabase
    .from(JOIN_REQUEST_TABLE)
    .select("id, learner_id, status, created_at, profiles:learner_id ( id, username, full_name )")
    .eq("class_id", classId)
    .eq("status", "approved");
}

export function createJoinRequest({ classId, learnerId }) {
  return supabase
    .from(JOIN_REQUEST_TABLE)
    .insert({ class_id: classId, learner_id: learnerId, status: "pending" })
    .select()
    .single();
}

export function updateJoinRequest(id, changes) {
  return supabase.from(JOIN_REQUEST_TABLE).update(changes).eq("id", id).select().single();
}
