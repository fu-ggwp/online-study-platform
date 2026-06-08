// Mirrors the `study_sets` table — flashcard/quiz sets learners study.
export const STUDY_SET_TABLE = "study_sets";

export const StudySetVisibility = Object.freeze({
  PUBLIC: "public",
  CLASS: "class",
  PRIVATE: "private",
});

/**
 * @typedef {Object} StudySet
 * @property {string} id
 * @property {string} owner_id        - FK -> profiles.id
 * @property {string} title
 * @property {string} description
 * @property {"public"|"class"|"private"} visibility
 * @property {string} class_id        - FK -> classes.id (nullable)
 * @property {string} question_bank_id - FK -> question_banks.id (nullable, source bank)
 * @property {string} created_at
 * @property {string} updated_at
 */
