import axiosClient from "./axiosClient";

export const dashboardsService = {
  getLearnerDashboard: () => axiosClient.get("/api/dashboards/learner").then((r) => r.data.data),
  getTeacherDashboard: () => axiosClient.get("/api/dashboards/teacher").then((r) => r.data.data),
};
