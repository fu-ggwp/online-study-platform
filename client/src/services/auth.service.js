import api from "./api";

export const authService = {
  register: (payload) => api.post("/api/auth/register", payload).then((r) => r.data),
  login: (payload) => api.post("/api/auth/login", payload).then((r) => r.data),
  logout: () => api.post("/api/auth/logout").then((r) => r.data),
  forgotPassword: (email) => api.post("/api/auth/forgot-password", { email }).then((r) => r.data),
  resetPassword: (payload) => api.post("/api/auth/reset-password", payload).then((r) => r.data),
  me: () => api.get("/api/auth/me").then((r) => r.data),
};
