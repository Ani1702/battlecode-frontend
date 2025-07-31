"use client";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";

type AuthContextType = {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  avatarUrl: string | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>(null!);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const supabase = createClientComponentClient({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  });
  const router = useRouter();

  useEffect(() => {
    const getSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      setSession(session);
      setUser(session?.user ?? null);
      setAvatarUrl(session?.user?.user_metadata?.avatar_url ?? null);
      setIsLoading(false);
    };

    getSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      console.log(session?.access_token);
      setUser(session?.user ?? null);
      setAvatarUrl(session?.user?.user_metadata?.avatar_url ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  // Token refresh logic - refresh every 60 minutes
  useEffect(() => {
    let refreshInterval: NodeJS.Timeout;

    if (session?.access_token) {
      const refreshToken = async () => {
        try {
          const { data, error } = await supabase.auth.refreshSession();
          if (error) {
            console.error('Token refresh failed:', error);
            // Handle refresh failure - redirect to dashboard
            await signOut();
            router.push('/dashboard');
          } else {
            console.log('Token refreshed successfully');
            setSession(data.session);
            setUser(data.session?.user ?? null);
            setAvatarUrl(data.session?.user?.user_metadata?.avatar_url ?? null);
          }
        } catch (error) {
          console.error('Token refresh error:', error);
          // Handle any unexpected errors - redirect to dashboard
          await signOut();
          router.push('/dashboard');
        }
      };

      // Refresh token every 60 minutes (3600000 ms)
      refreshInterval = setInterval(refreshToken, 60 * 60 * 1000);
    }

    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [session?.access_token, supabase.auth, router]);

  const signInWithGoogle = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${location.origin}/api/auth/callback`,
        },
      });

      if (error) {
        console.error("Sign-in error:", error);
        // Redirect to dashboard on sign-in error
        router.push("/dashboard");
        throw error;
      }

      router.push("/dashboard");
    } catch (error) {
      console.error("Error during Google sign-in:", error);
      // Redirect to dashboard on any error
      router.push("/dashboard");
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      router.push("/dashboard");
    } catch (error) {
      console.error("Sign-out error:", error);
      // Even if sign-out fails, redirect to dashboard
      router.push("/dashboard");
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, session, isLoading, avatarUrl, signInWithGoogle, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
