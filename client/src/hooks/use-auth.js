"use client";

import { useEffect, useState, useCallback } from "react";
import { clearAuthCookies, saveAuthCookies } from "../lib/auth-cookies";
import supabase from "../lib/supabaseClient";
import { profileService } from "../services/profile.service";

/**
 * Tracks the current Supabase session and the matching app profile
 * (role, username, etc.) so client components can gate UI by auth state.
 */
export function useAuth() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    try {
      const data = await profileService.getMine();
      setProfile(data);
      return data;
    } catch {
      setProfile(null);
      return null;
    }
  }, []);

  const syncAuthCookies = useCallback(
    async (currentSession) => {
      if (!currentSession) {
        clearAuthCookies();
        return;
      }

      const data = await loadProfile();
      saveAuthCookies({
        session: currentSession,
        role: data?.activeRole,
      });
    },
    [loadProfile]
  );

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      const currentSession = data?.session ?? null;
      setSession(currentSession);
      setLoading(false);
      syncAuthCookies(currentSession);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
        syncAuthCookies(newSession);
      }
    );

    if (window.location.hash.includes("access_token=")) {
      window.history.replaceState(null, "", window.location.pathname);
    }

    return () => {
      active = false;
      subscription?.subscription?.unsubscribe();
    };
  }, [syncAuthCookies]);

  return {
    session,
    user: session?.user ?? null,
    profile,
    role: profile?.activeRole ?? null,
    isAuthenticated: !!session,
    loading,
    refreshProfile: loadProfile,
  };
}
