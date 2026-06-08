// Minimal structured logger — swap the implementation later (pino/winston)
// without touching call sites elsewhere in the app.
const timestamp = () => new Date().toISOString();

export const logger = {
  info: (...args) => console.log(`[INFO ${timestamp()}]`, ...args),
  warn: (...args) => console.warn(`[WARN ${timestamp()}]`, ...args),
  error: (...args) => console.error(`[ERROR ${timestamp()}]`, ...args),
};
