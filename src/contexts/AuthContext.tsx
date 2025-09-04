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
  hasUsername: boolean | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  updateUsername: (username: string) => Promise<boolean>;
};

const AuthContext = createContext<AuthContextType>(null!);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [hasUsername, setHasUsername] = useState<boolean | null>(null);
  const supabase = createClientComponentClient({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  });
  const router = useRouter();

  useEffect(() => {
    const getSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        setSession(session);
        setUser(session?.user ?? null);
        setAvatarUrl(session?.user?.user_metadata?.avatar_url ?? null);
        
        // Check username status if user is logged in
        if (session?.access_token) {
          try {
            const response = await fetch("http://localhost:8000/api/user/verify", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${session.access_token}`,
              },
            });

            if (response.ok) {
              const data = await response.json();
              setHasUsername(data.hasUsername);
            } else {
              console.error("Initial verification failed - signing out existing session:", await response.text());
              
              // Force complete sign out for existing sessions that fail verification
              setSession(null);
              setUser(null);
              setHasUsername(null);
              setAvatarUrl(null);
              
              // Sign out from Supabase completely
              await supabase.auth.signOut();
              
              // Clear any potential cached auth data
              if (typeof window !== 'undefined') {
                localStorage.removeItem('supabase.auth.token');
                localStorage.removeItem('sb-auth-token');
              }
            }
          } catch (error) {
            console.error("Error checking username status - signing out existing session:", error);
            
            // Force complete sign out for existing sessions that fail verification
            setSession(null);
            setUser(null);
            setHasUsername(null);
            setAvatarUrl(null);
            
            // Sign out from Supabase completely
            await supabase.auth.signOut();
            
            // Clear any potential cached auth data
            if (typeof window !== 'undefined') {
              localStorage.removeItem('supabase.auth.token');
              localStorage.removeItem('sb-auth-token');
              // Also clear any other potential Supabase keys
              Object.keys(localStorage).forEach(key => {
                if (key.startsWith('sb-') || key.startsWith('supabase')) {
                  localStorage.removeItem(key);
                }
              });
            }
          }
        }
      } catch (error) {
        console.error("Error getting session:", error);
        setSession(null);
        setUser(null);
        setHasUsername(null);
      } finally {
        setIsLoading(false); // Always clear loading state
      }
    };

    getSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setAvatarUrl(session?.user?.user_metadata?.avatar_url ?? null);

      if (event === "SIGNED_IN" && session) {
        setIsLoading(true); // Set loading when starting verification
        try {
          const response = await fetch("http://localhost:8000/api/user/verify", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          });

          if (response.ok) {
            const data = await response.json();
            setHasUsername(data.hasUsername);
            setIsLoading(false); // Clear loading on success
            router.push("/dashboard"); // ONLY navigate on success
          } else {
            console.error("Backend verification failed:", await response.text());
            setIsLoading(false); // Clear loading on backend error
            
            // Force complete sign out when backend verification fails
            setSession(null);
            setUser(null);
            setHasUsername(null);
            setAvatarUrl(null);
            
            // Sign out from Supabase completely - DO NOT navigate to dashboard
            await supabase.auth.signOut();
            
            // Clear any potential cached auth data
            if (typeof window !== 'undefined') {
              localStorage.removeItem('supabase.auth.token');
              localStorage.removeItem('sb-auth-token');
              // Also clear any other potential Supabase keys
              Object.keys(localStorage).forEach(key => {
                if (key.startsWith('sb-') || key.startsWith('supabase')) {
                  localStorage.removeItem(key);
                }
              });
              // Force reload to ensure clean state - GO TO HOME, NOT DASHBOARD
              window.location.href = '/';
            } else {
              router.push("/"); // GO TO HOME, NOT DASHBOARD
            }
            // Early return to prevent any further execution
            return;
          }
        } catch (error) {
          console.error("Error verifying with backend:", error);
          setIsLoading(false); // Clear loading on network error
          
          // Force complete sign out when verification fails due to network error
          setSession(null);
          setUser(null);
          setHasUsername(null);
          setAvatarUrl(null);
          
          // Sign out from Supabase completely - DO NOT navigate to dashboard
          await supabase.auth.signOut();
          
          // Clear any potential cached auth data
          if (typeof window !== 'undefined') {
            localStorage.removeItem('supabase.auth.token');
            localStorage.removeItem('sb-auth-token');
            // Also clear any other potential Supabase keys
            Object.keys(localStorage).forEach(key => {
              if (key.startsWith('sb-') || key.startsWith('supabase')) {
                localStorage.removeItem(key);
              }
            });
            // Force reload to ensure clean state - GO TO HOME, NOT DASHBOARD
            window.location.href = '/';
          } else {
            router.push("/"); // GO TO HOME, NOT DASHBOARD
          }
          // Early return to prevent any further execution
          return;
        }
      } else if (event === "SIGNED_OUT") {
        setHasUsername(null);
        setIsLoading(false); // Clear loading on sign out
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth, router]);
  const signInWithGoogle = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${location.origin}/api/auth/callback`,
          queryParams: {
            prompt: 'select_account', // Force Google account selection
          },
        },
      });

      if (error) {
        console.error("Sign-in error:", error);
        throw error;
      }
    } catch (error) {
      console.error("Error during Google sign-in:", error);
    }
  };

  const signOut = async () => {
    try {
      // First, get the current session to access the provider token
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      
      // If there's a Google provider token, revoke it
      if (currentSession?.provider_token) {
        try {
          // Revoke the Google OAuth token
          await fetch(`https://oauth2.googleapis.com/revoke?token=${currentSession.provider_token}`, {
            method: 'POST',
          });
        } catch (revokeError) {
          console.warn('Failed to revoke Google token:', revokeError);
          // Continue with sign out even if revoke fails
        }
      }
      
      // Clear all local state immediately
      setSession(null);
      setUser(null);
      setHasUsername(null);
      setAvatarUrl(null);
      
      // Sign out from Supabase
      await supabase.auth.signOut();
      
      // Clear any cached authentication data aggressively
      if (typeof window !== 'undefined') {
        // Clear all Supabase-related localStorage items
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('sb-') || key.startsWith('supabase') || key.includes('auth')) {
            localStorage.removeItem(key);
          }
        });
        
        // Also clear our custom battlecode cache
        localStorage.removeItem('battlecode_leaderboard');
        localStorage.removeItem('battlecode_rounds');
        localStorage.removeItem('battlecode_locks');
        
        // Force reload to clear any remaining state
        window.location.href = '/';
      } else {
        router.push('/');
      }
    } catch (error) {
      console.error('Error signing out:', error);
      // Fallback: still clear local state and redirect aggressively
      setSession(null);
      setUser(null);
      setHasUsername(null);
      setAvatarUrl(null);
      
      if (typeof window !== 'undefined') {
        // Clear everything possible
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('sb-') || key.startsWith('supabase') || key.includes('auth') || key.startsWith('battlecode')) {
            localStorage.removeItem(key);
          }
        });
        window.location.href = '/';
      } else {
        router.push('/');
      }
    }
  };
  

  const updateUsername = async (username: string): Promise<boolean> => {
    try {
      if (!session?.access_token) {
        throw new Error("No active session");
      }

      const response = await fetch("http://localhost:8000/api/user/set-username", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ username }),
      });

      if (response.ok) {
        setHasUsername(true);
        return true;
      } else {
        const errorData = await response.json();
        console.error("Username update failed:", errorData.error);
        return false;
      }
    } catch (error) {
      console.error("Error updating username:", error);
      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, session, isLoading, avatarUrl, hasUsername, signInWithGoogle, signOut, updateUsername }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
