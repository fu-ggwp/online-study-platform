// Mirrors the `answer_options` table — choices belonging to a question.
export const ANSWER_OPTION_TABLE = "answer_options";

/**
 * @typedef {Object} AnswerOption
 * @property {string} id
 * @property {string} question_id  - FK -> questions.id
 * @property {string} content
 * @property {boolean} is_correct
 * @property {number} order_index
 */
