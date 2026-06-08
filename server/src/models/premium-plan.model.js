// Mirrors the `premium_plans` table — subscription tiers users can purchase.
export const PREMIUM_PLAN_TABLE = "premium_plans";

/**
 * @typedef {Object} PremiumPlan
 * @property {string} id
 * @property {string} name
 * @property {number} price
 * @property {string} currency
 * @property {number} duration_days
 * @property {string[]} features
 * @property {boolean} is_active
 */
