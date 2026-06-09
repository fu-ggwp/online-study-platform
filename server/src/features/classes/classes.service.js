import { getClassesByTeacher } from "./classes.dao.js";

/**
 * Return all classes owned by the given teacher.
 * Flattens the Supabase nested count into a plain `member_count` number.
 * @param {string} teacherId
 * @returns {Promise<Class[]>}
 */
export async function listTeacherClasses(teacherId) {
  const { data, error } = await getClassesByTeacher(teacherId);

  if (error) throw new Error(error.message);

  // Supabase returns count as [{ count: N }] — flatten to a plain number
  return data.map((cls) => ({
    ...cls,
    member_count: cls.member_count?.[0]?.count ?? 0,
  }));
}
