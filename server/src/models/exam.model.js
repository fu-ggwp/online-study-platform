// Mirrors the `exams` table — a timed, scheduled assessment created by a teacher.
export const EXAM_TABLE = "exams";

/**
 * @typedef {Object} Exam
 * @property {string} id
 * @property {string} teacher_id     - FK -> profiles.id
 * @property {string} class_id       - FK -> classes.id
 * @property {string} title
 * @property {number} duration_minutes
 * @property {string} starts_at
 * @property {string} ends_at
 * @property {boolean} show_results_immediately
 * @property {string} created_at
 * @property {string} updated_at
 */
