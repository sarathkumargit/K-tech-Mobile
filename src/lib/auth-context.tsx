// Signed-in state for the whole app: Supabase session + profile + admin flag.
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Session, User } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "@/lib/supabase";
import { qk } from "@/lib/query-keys";
import * as authService from "@/services/authService";
import { checkIsAdmin, getProfile, type Profile } from "@/services/userService";

type AuthContextValue = {
  configured: boolean;
  /** true until the saved session has been read (browser only) */
  loading: boolean;
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isAdmin: boolean;
  /** true while the admin check is still running for a signed-in user */
  adminLoading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let active = true;
    authService
      .getSession()
      .then((s) => active && setSession(s))
      .catch(() => active && setSession(null))
      .finally(() => active && setLoading(false));
    const unsubscribe = authService.onAuthChange((s) => {
      setSession(s);
      setLoading(false);
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const userId = session?.user.id ?? null;

  // When someone signs out or another account signs in, drop everything
  // cached for the previous user (their cart, orders, admin data).
  const previousUserId = useRef<string | null>(null);
  useEffect(() => {
    const previous = previousUserId.current;
    previousUserId.current = userId;
    if (previous && previous !== userId) {
      queryClient.removeQueries({
        predicate: (q) => q.queryKey[0] === "admin" || q.queryKey.includes(previous),
      });
    }
  }, [userId, queryClient]);

  const profileQuery = useQuery({
    queryKey: qk.profile(userId),
    queryFn: () => getProfile(userId!),
    enabled: Boolean(userId),
    staleTime: 1000 * 60 * 5,
  });

  const adminQuery = useQuery({
    queryKey: qk.isAdmin(userId),
    queryFn: checkIsAdmin,
    enabled: Boolean(userId),
    staleTime: 1000 * 60 * 5,
  });

  const value = useMemo<AuthContextValue>(
    () => ({
      configured: isSupabaseConfigured,
      loading,
      session,
      user: session?.user ?? null,
      profile: profileQuery.data ?? null,
      isAdmin: adminQuery.data === true,
      adminLoading: Boolean(userId) && adminQuery.isLoading,
      signOut: async () => {
        await authService.signOut();
        setSession(null);
      },
    }),
    [loading, session, profileQuery.data, adminQuery.data, adminQuery.isLoading, userId],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

// Display name: profile name, then Google/sign-up name, then the email.
export function displayName(user: User | null, profile: Profile | null) {
  return (
    profile?.full_name ||
    (user?.user_metadata?.["full_name"] as string | undefined) ||
    (user?.user_metadata?.["name"] as string | undefined) ||
    user?.email ||
    "Account"
  );
}
