// Cross-cutting AI integration (Gemini API) consumed by other features
// (e.g. question-banks for question generation, study-sets/exams for explanations).
// Persists every call to `ai_interactions` so usage can be audited/rate-limited.
import supabase from "../../config/supabase.js";
import { env } from "../../config/env.js";
import { logger } from "../../utils/logger.js";
import { AI_INTERACTION_TABLE, AiInteractionType } from "../../models/ai-interaction.model.js";

const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

async function callGemini(prompt) {
  if (!env.geminiApiKey) {
    throw Object.assign(new Error("Gemini API key is not configured"), { status: 500 });
  }

  const response = await fetch(`${GEMINI_ENDPOINT}?key=${env.geminiApiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
  });

  if (!response.ok) {
    const text = await response.text();
    logger.error("[ai.service] Gemini API error", { status: response.status, body: text });
    throw Object.assign(new Error("AI provider request failed"), { status: 502 });
  }

  const json = await response.json();
  return json?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

async function logInteraction({ userId, type, input, output }) {
  const { error } = await supabase.from(AI_INTERACTION_TABLE).insert({
    user_id: userId,
    type,
    input,
    output,
    created_at: new Date().toISOString(),
  });
  if (error) logger.warn("[ai.service] failed to log AI interaction", error);
}

/**
 * Generates a learner-friendly explanation for why an answer is correct/incorrect.
 * Used by study-sets/exams when surfacing results.
 */
export async function explainAnswer(userId, { question, correctAnswer, learnerAnswer }) {
  const prompt =
    `Question: ${question}\n` +
    `Correct answer: ${correctAnswer}\n` +
    `Learner's answer: ${learnerAnswer}\n` +
    `Explain in simple terms why the correct answer is right and, if the learner was wrong, why their answer is incorrect.`;

  const output = await callGemini(prompt);
  await logInteraction({ userId, type: AiInteractionType.EXPLANATION, input: { question, correctAnswer, learnerAnswer }, output });
  return output;
}

/**
 * Generates draft quiz questions for a topic. Used by question-banks when
 * teachers want AI-assisted question authoring.
 */
export async function generateQuestions(userId, { topic, count = 5, difficulty = "medium" }) {
  const prompt =
    `Generate ${count} multiple-choice quiz questions about "${topic}" at ${difficulty} difficulty. ` +
    `Return each question with four answer options and indicate the correct one.`;

  const output = await callGemini(prompt);
  await logInteraction({ userId, type: AiInteractionType.QUESTION_GENERATION, input: { topic, count, difficulty }, output });
  return output;
}
