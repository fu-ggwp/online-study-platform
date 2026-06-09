import supabase from "../../config/supabase.js";
import { CLASS_TABLE } from "../../models/class.model.js";
import { CLASS_MEMBER_TABLE } from "../../models/join-request.model.js";

/**
 * Get all classes created by a teacher, with member count.
 * @param {string} teacherId
 * @returns {Promise<{data: any[], error: any}>}
 */
export async function getClassesByTeacher(teacherId) {
  const { data, error } = await supabase
    .from(CLASS_TABLE)
    .select(
      `
      *,
      member_count:${CLASS_MEMBER_TABLE}(count)
    `
    )
    .eq("teacher_id", teacherId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  return { data, error };
}
