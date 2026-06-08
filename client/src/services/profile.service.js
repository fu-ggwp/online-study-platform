import api from "./api";

export const profileService = {
  getMine: () => api.get("/api/profiles/me").then((r) => r.data),
  updateMine: (changes) => api.patch("/api/profiles/me", changes).then((r) => r.data),
  getByUsername: (username) => api.get(`/api/profiles/${username}`).then((r) => r.data),
};
