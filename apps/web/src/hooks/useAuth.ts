import { createContext, createElement, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

type AuthState = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  updateProfile: (profile: { name: string; username: string }) => Promise<User>;
  signOut: () => Promise<unknown>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(false);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const updateProfile = async ({ name, username }: { name: string; username: string }) => {
    const { data, error } = await supabase.auth.updateUser({
      data: {
        name,
        full_name: name,
        username,
        user_name: username,
        preferred_username: username
      }
    });

    if (error) throw error;
    if (data.user) setUser(data.user);
    return data.user;
  };

  const value = useMemo(() => ({
    session,
    user,
    loading,
    updateProfile,
    signOut: () => supabase.auth.signOut()
  }), [loading, session, user]);

  return createElement(AuthContext.Provider, { value }, children);
}

export function useAuth() {
  const auth = useContext(AuthContext);
  if (!auth) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return auth;
}
