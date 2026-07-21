export const ACCESS_TOKEN_COOKIE = "access_token";
export const ACTIVE_ROLE_COOKIE = "active_role";

export const VALID_ROLES = new Set(["admin", "teacher", "learner"]);

export const ROLE_HOME = {
  admin: "/admin/users",
  teacher: "/teacher",
  learner: "/learner",
};

export const SWITCHABLE_ROLE_HOME = {
  teacher: ROLE_HOME.teacher,
  learner: ROLE_HOME.learner,
};

export const BLOCKED_NEXT_ROUTES = ["/login", "/register", "/auth/callback"];
