import * as dao from "./payments.dao.js";
import * as gateway from "./payment-gateway.service.js";
import { PaymentStatus } from "../../models/payment.model.js";
import { env } from "../../config/env.js";

function dbError(error, status = 400) {
  return Object.assign(new Error(error.message), { status });
}
function notFound(message = "Payment not found") {
  return Object.assign(new Error(message), { status: 404 });
}

export async function listPlans() {
  const { data, error } = await dao.findActivePlans();
  if (error) throw dbError(error, 500);
  return data;
}

export async function listMyPayments(userId) {
  const { data, error } = await dao.findPaymentsByUser(userId);
  if (error) throw dbError(error, 500);
  return data;
}

export async function getPayment(id) {
  const { data, error } = await dao.findPaymentById(id);
  if (error || !data) throw notFound();
  return data;
}

// Learner: subscribe to a premium plan → /learner/payments/checkout
export async function startCheckout(userId, planId) {
  const { data: plan, error } = await dao.findPlanById(planId);
  if (error || !plan) throw Object.assign(new Error("Premium plan not found"), { status: 404 });

  const { providerRef, redirectUrl } = await gateway.createCheckoutSession({
    amount: plan.price,
    currency: plan.currency,
    planId: plan.id,
    userId,
  });

  const { data: payment, error: insertError } = await dao.createPayment({
    user_id: userId,
    premium_plan_id: plan.id,
    amount: plan.price,
    currency: plan.currency,
    status: PaymentStatus.PENDING,
    provider: env.paymentProvider,
    provider_ref: providerRef,
    created_at: new Date().toISOString(),
  });
  if (insertError) throw dbError(insertError);

  return { payment, redirectUrl };
}

// Provider webhook callback → /api/payments/webhook
export async function handleWebhook(payload) {
  const { providerRef, status } = gateway.parseWebhookEvent(payload);
  if (!providerRef) throw Object.assign(new Error("Missing provider reference"), { status: 422 });

  const { data: payment, error } = await dao.findPaymentByProviderRef(providerRef);
  if (error || !payment) throw notFound("Payment not found for provider reference");

  const { data, error: updateError } = await dao.updatePayment(payment.id, { status });
  if (updateError) throw dbError(updateError);
  return data;
}
