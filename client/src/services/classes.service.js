import api from "./api";

export const classesService = {
  // Teacher: view/manage created classes
  listMine: (params) => api.get("/api/classes", { params }).then((r) => r.data),
  getOne: (id) => api.get(`/api/classes/${id}`).then((r) => r.data),
  create: (payload) => api.post("/api/classes", payload).then((r) => r.data),
  update: (id, changes) => api.patch(`/api/classes/${id}`, changes).then((r) => r.data),
  remove: (id) => api.delete(`/api/classes/${id}`).then((r) => r.data),
  listMembers: (id) => api.get(`/api/classes/${id}/members`).then((r) => r.data),

  // Learner: join a class
  join: (id) => api.post(`/api/classes/${id}/join`).then((r) => r.data),
  resolveJoinRequest: (requestId, status) =>
    api.patch(`/api/classes/join-requests/${requestId}`, { status }).then((r) => r.data),
};
