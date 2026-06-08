// Mirrors the `reports` table — generated analytics/progress reports.
export const REPORT_TABLE = "reports";

/**
 * @typedef {Object} Report
 * @property {string} id
 * @property {string} owner_id     - FK -> profiles.id (teacher or learner)
 * @property {string} class_id     - FK -> classes.id (nullable)
 * @property {string} type         - e.g. "class_performance", "learner_progress"
 * @property {Object} data         - JSON payload of computed metrics
 * @property {string} generated_at
 */
