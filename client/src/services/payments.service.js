import api from "./api";

export const paymentsService = {
  listPlans: () => api.get("/api/payments/plans").then((r) => r.data),
  listMine: () => api.get("/api/payments").then((r) => r.data),
  getOne: (id) => api.get(`/api/payments/${id}`).then((r) => r.data),
  startCheckout: (planId) => api.post("/api/payments/checkout", { planId }).then((r) => r.data),
};
