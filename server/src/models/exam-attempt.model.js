// Mirrors the `exam_attempts` table — a learner's attempt at an exam session.
// (The earlier scaffold pointed `exam_id` at a nonexistent `exams` table; the
// real FK is `exam_session_id` -> exam_sessions.exam_session_id.)
export const EXAM_ATTEMPT_TABLE = "exam_attempts";

export const ExamAttemptStatus = Object.freeze({
  IN_PROGRESS: "in_progress",
  SUBMITTED: "submitted",
});

/**
 * @typedef {Object} ExamAttempt
 * @property {string} exam_attempt_id
 * @property {string} exam_session_id  - FK -> exam_sessions.exam_session_id
 * @property {string} learner_id       - FK -> users.user_id
 * @property {number} attempt_number
 * @property {string} started_at
 * @property {string} expires_at
 * @property {string} [submitted_at]
 * @property {"in_progress"|"submitted"} status
 * @property {boolean} is_auto_submitted
 * @property {string[]} question_order
 * @property {Record<string, number[]>} answer_order
 * @property {number} warning_count
 * @property {number} total_score
 * @property {string} created_at
 * @property {string} updated_at
 */
