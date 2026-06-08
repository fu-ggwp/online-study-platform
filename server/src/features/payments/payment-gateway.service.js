// Thin wrapper around the external payment provider (Stripe/VNPAY).
// Centralizes provider-specific request/response shaping so the rest of the
// feature only deals with a normalized { providerRef, redirectUrl, status } shape.
import { env } from "../../config/env.js";
import { logger } from "../../utils/logger.js";

const PROVIDER = env.paymentProvider;

/**
 * Creates a checkout/payment session with the configured provider.
 * @param {{ amount: number, currency: string, planId: string, userId: string }} params
 * @returns {Promise<{ providerRef: string, redirectUrl: string }>}
 */
export async function createCheckoutSession({ amount, currency, planId, userId }) {
  // Placeholder integration: replace with real Stripe/VNPAY SDK calls.
  logger.info(`[payment-gateway] creating ${PROVIDER} checkout session`, { amount, currency, planId, userId });

  const providerRef = `${PROVIDER}_${Date.now()}_${userId.slice(0, 8)}`;
  const redirectUrl = `${env.paymentRedirectBaseUrl}/checkout/${providerRef}`;

  return { providerRef, redirectUrl };
}

/**
 * Verifies and parses a webhook/callback payload from the provider.
 * @param {Object} payload
 * @returns {{ providerRef: string, status: "succeeded"|"failed"|"refunded", raw: Object }}
 */
export function parseWebhookEvent(payload) {
  // Placeholder: real implementation must verify provider signatures.
  return {
    providerRef: payload?.providerRef || payload?.id,
    status: payload?.status || "failed",
    raw: payload,
  };
}
