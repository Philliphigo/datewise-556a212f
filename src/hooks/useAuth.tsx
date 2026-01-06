import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  suspension: { active: boolean; until: string | null; reason: string | null } | null;
  refreshSuspension: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [suspension, setSuspension] = useState<AuthContextType["suspension"]>(null);
  const navigate = useNavigate();

  const refreshSuspension = async (userId?: string) => {
    const uid = userId || session?.user?.id;
    if (!uid) {
      setSuspension(null);
      return;
    }

    const { data, error } = await supabase
      .from("user_suspensions")
      .select("suspended_until, reason, created_at")
      .eq("user_id", uid)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      setSuspension(null);
      return;
    }

    const active = data.suspended_until === null || new Date(data.suspended_until) > new Date();
    setSuspension(active ? { active: true, until: data.suspended_until, reason: data.reason ?? null } : null);
  };

  useEffect(() => {
    // Set up auth state listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      if (session?.user) {
        refreshSuspension(session.user.id);
      } else {
        setSuspension(null);
      }
    });

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      if (session?.user) {
        refreshSuspension(session.user.id);
      } else {
        setSuspension(null);
      }
    });

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, suspension, refreshSuspension, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
