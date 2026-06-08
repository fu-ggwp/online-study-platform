import api from "./api";

export const questionBanksService = {
  listMine: () => api.get("/api/question-banks").then((r) => r.data),
  getOne: (id) => api.get(`/api/question-banks/${id}`).then((r) => r.data),
  create: (payload) => api.post("/api/question-banks", payload).then((r) => r.data),
  update: (id, changes) => api.patch(`/api/question-banks/${id}`, changes).then((r) => r.data),
  remove: (id) => api.delete(`/api/question-banks/${id}`).then((r) => r.data),

  listQuestions: (id) => api.get(`/api/question-banks/${id}/questions`).then((r) => r.data),
  addQuestion: (id, payload) => api.post(`/api/question-banks/${id}/questions`, payload).then((r) => r.data),
  updateQuestion: (qid, changes) => api.patch(`/api/question-banks/questions/${qid}`, changes).then((r) => r.data),
};
