"use client";

import { useEffect, useState, useCallback } from "react";
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
      const { data } = await profileService.getMine();
      setProfile(data);
    } catch {
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data?.session ?? null);
      setLoading(false);
      if (data?.session) loadProfile();
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession) loadProfile();
      else setProfile(null);
    });

    return () => {
      active = false;
      subscription?.subscription?.unsubscribe();
    };
  }, [loadProfile]);

  return {
    session,
    user: session?.user ?? null,
    profile,
    role: profile?.role ?? null,
    isAuthenticated: !!session,
    loading,
    refreshProfile: loadProfile,
  };
}
