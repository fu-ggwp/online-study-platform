const ACCESS_TOKEN_COOKIE = "access_token";
const ROLE_COOKIE = "role";

function getMaxAge(session) {
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

export function saveAuthCookies({ session, role }) {
  if (!session?.access_token || !role || typeof document === "undefined") {
    return;
  }

  const maxAge = getMaxAge(session);
  setCookie(ACCESS_TOKEN_COOKIE, session.access_token, maxAge);
  setCookie(ROLE_COOKIE, role, maxAge);
}

export function clearAuthCookies() {
  if (typeof document === "undefined") return;

  deleteCookie(ACCESS_TOKEN_COOKIE);
  deleteCookie(ROLE_COOKIE);
}
