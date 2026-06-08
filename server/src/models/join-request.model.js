// Mirrors the `join_requests` table — a learner's request to join a class.
export const JOIN_REQUEST_TABLE = "join_requests";

export const JoinRequestStatus = Object.freeze({
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
});

/**
 * @typedef {Object} JoinRequest
 * @property {string} id
 * @property {string} class_id      - FK -> classes.id
 * @property {string} learner_id    - FK -> profiles.id
 * @property {"pending"|"approved"|"rejected"} status
 * @property {string} created_at
 * @property {string} resolved_at
 */
