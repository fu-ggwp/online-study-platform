// Mirrors the `practice_sessions` table — a learner's flashcard/quiz study run.
export const PRACTICE_SESSION_TABLE = "practice_sessions";

/**
 * @typedef {Object} PracticeSession
 * @property {string} id
 * @property {string} learner_id    - FK -> profiles.id
 * @property {string} study_set_id  - FK -> study_sets.id
 * @property {string} mode          - "flashcards" | "quiz"
 * @property {number} score
 * @property {string} started_at
 * @property {string} completed_at
 */
