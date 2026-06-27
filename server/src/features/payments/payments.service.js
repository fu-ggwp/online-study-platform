import { supabaseClient } from "../../config/supabase.js";
import * as dao from "./payments.dao.js";

function dbError(error, status = 500) {
  return Object.assign(new Error(error.message || "Failed to load premium plans."), {
    status,
  });
}

function getBearerToken(req) {
  const authHeader = req.headers.authorization || "";
  return authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
}

async function resolveOptionalUser(req) {
  const token = getBearerToken(req);
  if (!token) return null;

  const { data, error } = await supabaseClient.auth.getUser(token);
  if (error || !data?.user) return null;

  return data.user;
}

function groupFeaturesByPlan(links = [], features = []) {
  const featureByCode = new Map(
    features.map((feature) => [feature.feature_code, feature]),
  );
  const grouped = new Map();

  links.forEach((link) => {
    const feature = featureByCode.get(link.feature_code);
    if (!feature) return;

    const current = grouped.get(link.premium_plan_id) || [];
    current.push({
      feature_code: feature.feature_code,
      feature_name: feature.feature_name,
      description: feature.description,
    });
    grouped.set(link.premium_plan_id, current);
  });

  return grouped;
}

function formatSubscription(subscription, plan) {
  if (!subscription?.subscription_id) return null;

  return {
    subscription_id: subscription.subscription_id,
    premium_plan_id: subscription.premium_plan_id,
    plan_name: plan?.plan_name || null,
    display_name: plan?.display_name || null,
    end_at: subscription.end_at,
  };
}

export async function listPlans(req) {
  const { data: plans, error: plansError } = await dao.findActivePremiumPlans();
  if (plansError) throw dbError(plansError);

  const planIds = (plans || []).map((plan) => plan.premium_plan_id);
  const { data: links, error: linksError } = await dao.findPlanFeatureLinks(planIds);
  if (linksError) throw dbError(linksError);

  const featureCodes = [...new Set((links || []).map((link) => link.feature_code))];
  const { data: features, error: featuresError } =
    await dao.findPremiumFeatures(featureCodes);
  if (featuresError) throw dbError(featuresError);

  const featuresByPlan = groupFeaturesByPlan(links || [], features || []);
  const currentUser = await resolveOptionalUser(req);
  let currentSubscription = null;

  if (currentUser?.id) {
    const { data: subscription, error: subscriptionError } =
      await dao.findActiveSubscriptionForUser(currentUser.id);
    if (subscriptionError) throw dbError(subscriptionError);

    if (subscription?.premium_plan_id) {
      const { data: subscriptionPlan, error: subscriptionPlanError } =
        await dao.findPremiumPlanById(subscription.premium_plan_id);
      if (subscriptionPlanError) throw dbError(subscriptionPlanError);
      currentSubscription = formatSubscription(subscription, subscriptionPlan);
    }
  }

  return {
    plans: (plans || []).map((plan) => ({
      ...plan,
      features: featuresByPlan.get(plan.premium_plan_id) || [],
    })),
    currentSubscription,
  };
}
