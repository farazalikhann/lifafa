"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

export interface UseUser {
  user: User | null;
  /** True until the first answer arrives — signed in and signed out both resolve it. */
  isLoading: boolean;
  signOut: () => Promise<void>;
}

/**
 * The signed-in host, live.
 *
 * `isLoading` is a third state rather than a null user, because "we do not know
 * yet" and "nobody is signed in" call for different UI: the first is a
 * placeholder, the second is a sign-in prompt. Collapsing them makes every
 * consumer flash a signed-out state on first paint.
 *
 * Nothing here reads an email or any other identifier, so a phone-based
 * identity arrives through the same hook unchanged.
 */
export function useUser(): UseUser {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    /*
      The subscription can outlive the component — a token refresh fires
      whenever it fires — so every setState is gated on this flag and the
      listener is torn down below. Without it, signing out on a page that has
      already unmounted warns about updating an unmounted component.
    */
    let active = true;

    void supabase.auth
      .getUser()
      .then(({ data }) => {
        if (!active) return;
        setUser(data.user);
        setIsLoading(false);
      })
      .catch(() => {
        /* Treated as signed out: an unreachable auth server is not a session. */
        if (!active) return;
        setUser(null);
        setIsLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async (): Promise<void> => {
    const supabase = createClient();
    await supabase.auth.signOut();

    /*
      refresh(), not just local state: the dashboard is server-rendered against
      the session cookie, so clearing it in the browser alone would leave the
      previous host's markup on screen until something else re-fetched.
    */
    router.refresh();
    router.push("/");
  }, [router]);

  return { user, isLoading, signOut };
}
