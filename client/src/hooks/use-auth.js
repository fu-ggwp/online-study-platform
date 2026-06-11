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

    completeLogin().then(({ session: currentSession, profile: data }) => {
      if (!active) return;
      setSession(currentSession);
      setProfile(data);
      setLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        setSession(newSession);
        const { profile: data } = await completeLogin();
        if (!active) return;
        setProfile(data);
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
