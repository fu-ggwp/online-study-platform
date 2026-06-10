import { listTeacherClasses } from "./classes.service.js";

/**
 * GET /api/classes
 * Returns all classes belonging to the logged-in teacher.
 */
export async function getMyClasses(req, res) {
  try {
    const teacherId = req.user.id;
    const classes = await listTeacherClasses(teacherId);
    res.json({ ok: true, data: classes });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}
