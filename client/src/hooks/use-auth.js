"use client";

import { useEffect, useState, useCallback } from "react";
import supabase from "../lib/supabaseClient";
import { completeLogin } from "../services/auth.service";
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

  useEffect(() => {
    let active = true;

    async function syncAuthState(sessionToSync) {
      try {
        const { session: currentSession, profile: data } = await completeLogin(
          sessionToSync
        );
        if (!active) return;
        setSession(currentSession);
        setProfile(data);
      } catch {
        if (!active) return;
        setSession(null);
        setProfile(null);
      } finally {
        if (active) setLoading(false);
      }
    }

    syncAuthState();

    const { data: subscription } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        await syncAuthState(newSession);
      }
    );

    return () => {
      active = false;
      subscription?.subscription?.unsubscribe();
    };
  }, []);

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
