// Mirrors the `exam_attempts` table — a learner's attempt at an exam.
export const EXAM_ATTEMPT_TABLE = "exam_attempts";

export const ExamAttemptStatus = Object.freeze({
  IN_PROGRESS: "in_progress",
  SUBMITTED: "submitted",
  AUTO_SUBMITTED: "auto_submitted",
  GRADED: "graded",
});

/**
 * @typedef {Object} ExamAttempt
 * @property {string} id
 * @property {string} exam_id      - FK -> exams.id
 * @property {string} learner_id   - FK -> profiles.id
 * @property {"in_progress"|"submitted"|"auto_submitted"|"graded"} status
 * @property {number} score
 * @property {string} started_at
 * @property {string} submitted_at
 */
