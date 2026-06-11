import supabase from "@/lib/supabaseClient";
import api from "@/services/api";
import { profileService } from "@/services/profile.service";

const ACCESS_TOKEN_COOKIE = "access_token";
const ROLE_COOKIE = "role";

function getCookieMaxAge(session) {
  if (!session?.expires_at) return 60 * 60;

  return Math.max(0, session.expires_at - Math.floor(Date.now() / 1000));
}

function setCookie(name, value, maxAge) {
  document.cookie = `${name}=${encodeURIComponent(
    value
  )}; path=/; max-age=${maxAge}; samesite=lax`;
}

function deleteCookie(name) {
  document.cookie = `${name}=; path=/; max-age=0; samesite=lax`;
}

function saveAuthCookies({ session, role }) {
  if (!session?.access_token || !role || typeof document === "undefined") {
    return;
  }

  const maxAge = getCookieMaxAge(session);
  setCookie(ACCESS_TOKEN_COOKIE, session.access_token, maxAge);
  setCookie(ROLE_COOKIE, role, maxAge);
}

function clearAuthCookies() {
  if (typeof document === "undefined") return;

  deleteCookie(ACCESS_TOKEN_COOKIE);
  deleteCookie(ROLE_COOKIE);
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getProfileWithRetry() {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await profileService.getMine();
    } catch (error) {
      const status = error?.response?.status;
      if (status !== 404 || attempt === 2) throw error;
      await wait(300);
    }
  }

  return null;
}

async function getCurrentSession() {
  const { data } = await supabase.auth.getSession();
  return data?.session ?? null;
}

export const authService = {
  register: (payload) => api.post("/api/auth/register", payload).then((r) => r.data),
  login: (payload) => api.post("/api/auth/login", payload).then((r) => r.data),
  logout: () => api.post("/api/auth/logout").then((r) => r.data),
  forgotPassword: (email) => api.post("/api/auth/forgot-password", { email }).then((r) => r.data),
  resetPassword: (payload) => api.post("/api/auth/reset-password", payload).then((r) => r.data),
  me: () => api.get("/api/auth/me").then((r) => r.data),
};

export async function completeLogin(session = null) {
  const currentSession = session || (await getCurrentSession());

  if (!currentSession) {
    clearAuthCookies();
    return { session: null, profile: null };
  }

  if (session?.access_token && session?.refresh_token) {
    const { error } = await supabase.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    });

    if (error) throw error;
  }

  const profile = await getProfileWithRetry();
  saveAuthCookies({
    session: currentSession,
    role: profile?.activeRole,
  });

  return { session: currentSession, profile };
}

export function cleanOAuthHash() {
  if (
    typeof window !== "undefined" &&
    window.location.hash.includes("access_token=")
  ) {
    window.history.replaceState(null, "", window.location.pathname);
  }
}
