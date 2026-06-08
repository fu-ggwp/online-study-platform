// Mirrors the `questions` table.
export const QUESTION_TABLE = "questions";

export const QuestionType = Object.freeze({
  MULTIPLE_CHOICE: "multiple_choice",
  TRUE_FALSE: "true_false",
  SHORT_ANSWER: "short_answer",
});

/**
 * @typedef {Object} Question
 * @property {string} id
 * @property {string} question_bank_id  - FK -> question_banks.id
 * @property {string} content
 * @property {"multiple_choice"|"true_false"|"short_answer"} type
 * @property {string} explanation
 * @property {number} difficulty
 * @property {string} created_at
 * @property {string} updated_at
 */
