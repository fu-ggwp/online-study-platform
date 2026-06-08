// Mirrors the `ai_interactions` table — logs of Gemini-API-assisted features
// (answer explanations, question generation, etc.).
export const AI_INTERACTION_TABLE = "ai_interactions";

export const AiInteractionType = Object.freeze({
  EXPLANATION: "explanation",
  QUESTION_GENERATION: "question_generation",
});

/**
 * @typedef {Object} AiInteraction
 * @property {string} id
 * @property {string} user_id   - FK -> profiles.id
 * @property {"explanation"|"question_generation"} type
 * @property {Object} input
 * @property {Object} output
 * @property {string} created_at
 */
