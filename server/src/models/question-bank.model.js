// Mirrors the `question_banks` table — a teacher's private question repository.
export const QUESTION_BANK_TABLE = "question_banks";

/**
 * @typedef {Object} QuestionBank
 * @property {string} id
 * @property {string} teacher_id   - FK -> profiles.id
 * @property {string} name
 * @property {string} description
 * @property {string} subject
 * @property {string} created_at
 * @property {string} updated_at
 */
