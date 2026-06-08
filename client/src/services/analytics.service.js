import api from "./api";

export const analyticsService = {
  listReports: () => api.get("/api/analytics/reports").then((r) => r.data),
  getReport: (id) => api.get(`/api/analytics/reports/${id}`).then((r) => r.data),
  generateClassReport: (classId) =>
    api.post(`/api/analytics/classes/${classId}/report`).then((r) => r.data),
  generateLearnerReport: () => api.post("/api/analytics/progress").then((r) => r.data),
};
