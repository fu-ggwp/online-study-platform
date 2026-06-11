"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { cleanOAuthHash, completeLogin } from "@/services/auth.service";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [message, setMessage] = useState("Completing sign in...");

  useEffect(() => {
    let active = true;

    async function completeAuth() {
      try {
        await completeLogin();
        cleanOAuthHash();
        router.replace("/");
        router.refresh();
      } catch (error) {
        if (active) {
          setMessage(error.message || "Could not complete sign in.");
        }
        cleanOAuthHash();
        router.replace("/login");
      }
    }

    completeAuth();

    return () => {
      active = false;
    };
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <p className="text-sm text-muted-foreground">{message}</p>
    </main>
  );
}
