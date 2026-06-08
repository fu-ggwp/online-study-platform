// Mirrors the `payments` table — a Stripe/VNPAY transaction record.
export const PAYMENT_TABLE = "payments";

export const PaymentStatus = Object.freeze({
  PENDING: "pending",
  SUCCEEDED: "succeeded",
  FAILED: "failed",
  REFUNDED: "refunded",
});

/**
 * @typedef {Object} Payment
 * @property {string} id
 * @property {string} user_id        - FK -> profiles.id
 * @property {string} premium_plan_id - FK -> premium_plans.id
 * @property {number} amount
 * @property {string} currency
 * @property {"pending"|"succeeded"|"failed"|"refunded"} status
 * @property {string} provider       - "stripe" | "vnpay"
 * @property {string} provider_ref   - external transaction id
 * @property {string} created_at
 */
