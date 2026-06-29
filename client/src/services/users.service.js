import axiosClient from "./axiosClient";

export const usersService = {
  listPublic: (params) =>
    axiosClient.get("/api/users/public", { params }).then((r) => r.data),
  getPublicProfile: (username) =>
    axiosClient
      .get(`/api/users/public/${encodeURIComponent(username)}`)
      .then((r) => r.data),

  // Admin: full user list with search/filters (UC-51 / section 3.9.1).
  // Returns the payload { items, pagination } directly.
  listForAdmin: (params) =>
    axiosClient.get("/api/users", { params }).then((r) => r.data.data),

  // Admin: single user detail (UC-52 / section 3.9.2).
  getForAdmin: (id) => axiosClient.get(`/api/users/${id}`).then((r) => r.data.data),

  // Admin: update a user's account status. payload: { status, reason? }
  updateStatus: (id, payload) =>
    axiosClient.patch(`/api/users/${id}/status`, payload).then((r) => r.data.data),
};
