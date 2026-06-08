// Mirrors the `learner_answers` table — a learner's answer within a practice session.
export const LEARNER_ANSWER_TABLE = "learner_answers";

/**
 * @typedef {Object} LearnerAnswer
 * @property {string} id
 * @property {string} practice_session_id - FK -> practice_sessions.id
 * @property {string} question_id         - FK -> questions.id
 * @property {string} selected_option_id  - FK -> answer_options.id (nullable)
 * @property {string} answer_text         - for short-answer questions
 * @property {boolean} is_correct
 * @property {string} answered_at
 */
