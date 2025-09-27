"use client";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";

type AuthContextType = {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  avatarUrl: string | null;
  hasUsername: boolean | null;
  username: string | null;
  userName: string | null; // Added name from database
  userId: string | null;
  userRole: string | null;
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
  const [username, setUsername] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null); // Added name state
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const router = useRouter();

  useEffect(() => {
    const getSession = async () => {
      try {
        // Force clear any stuck sessions on initial load
        if (typeof window !== 'undefined') {
          const hasStuckSession = localStorage.getItem('stuck_session_detected');
          
          // Only clear if we explicitly marked a session as stuck, not just because we're on dashboard
          if (hasStuckSession === 'true') {
            console.log('Clearing explicitly marked stuck session...');
            await supabase.auth.signOut();
            localStorage.removeItem('stuck_session_detected');
            // Clear all auth-related storage
            Object.keys(localStorage).forEach(key => {
              if (key.startsWith('sb-') || key.startsWith('supabase') || key.includes('auth')) {
                localStorage.removeItem(key);
              }
            });
            setSession(null);
            setUser(null);
            setUserId(null);
            setHasUsername(null);
            setUsername(null);
            setUserName(null);
            setUserRole(null);
            setAvatarUrl(null);
            setIsLoading(false);
            return;
          }
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();

        setSession(session);
        setUser(session?.user ?? null);
        setUserId(session?.user?.id ?? null);
        setAvatarUrl(session?.user?.user_metadata?.avatar_url ?? null);
        
        // Check username status if user is logged in
        if (session?.access_token) {
          setIsLoading(true); // Set loading during verification
          try {
            console.log("Initial session verification starting...");
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/user/verify`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${session.access_token}`,
              },
            });

            if (response.ok) {
              const data = await response.json();
              console.log("Initial session verification successful:", data);
              setHasUsername(data.hasUsername);
              
              // Store the user data from backend
              if (data.user) {
                setUsername(data.user.username);
                setUserName(data.user.name); // Store the name
                setUserId(data.user.id);
                setUserRole(data.user.role);
              }
              setIsLoading(false); // Clear loading on success
            } else {
              console.error("Initial verification failed - signing out existing session:", await response.text());
              
              // Mark as stuck session and clear everything
              if (typeof window !== 'undefined') {
                localStorage.setItem('stuck_session_detected', 'true');
              }
              
              // Force complete sign out for existing sessions that fail verification
              setSession(null);
              setUser(null);
              setUserId(null);
              setHasUsername(null);
              setUsername(null);
              setUserName(null); // Clear name
              setUserRole(null);
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
            
            // Mark as stuck session
            if (typeof window !== 'undefined') {
              localStorage.setItem('stuck_session_detected', 'true');
            }
            
            // Force complete sign out for existing sessions that fail verification
            setSession(null);
            setUser(null);
            setUserId(null);
            setHasUsername(null);
            setUsername(null);
            setUserRole(null);
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
    } = supabase.auth.onAuthStateChange(async (event: string, session: Session | null) => {
      console.log("Auth state change event:", event, "Current path:", window.location.pathname);
      
      setSession(session);
      setUser(session?.user ?? null);
      setUserId(session?.user?.id ?? null);
      setAvatarUrl(session?.user?.user_metadata?.avatar_url ?? null);

      // Handle different auth events appropriately
      if (event === "SIGNED_IN" && session) {
        // Only handle actual sign-ins, not token refreshes
        setIsLoading(true); // Set loading when starting verification
        try {
          console.log("Starting backend verification for SIGNED_IN event...");
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/user/verify`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          });

          if (response.ok) {
            const data = await response.json();
            console.log("Backend verification successful:", data);
            setHasUsername(data.hasUsername);
            
            // Store the user data from backend
            if (data.user) {
              setUsername(data.user.username);
              setUserId(data.user.id);
              setUserRole(data.user.role);
            }
            
            setIsLoading(false); // Clear loading on success
            
            // Only redirect to dashboard if we're on the home page or login page
            // Don't redirect if user is already navigating within the app
            const currentPath = window.location.pathname;
            console.log("Current path after verification:", currentPath);
            // if (currentPath === '/' || currentPath === '/login' || currentPath === '/auth-error') {
            //   console.log("Redirecting to dashboard...");
            //   router.push("/dashboard");
            // }
            // For any other path (like /r0/code), let the user stay where they are
          } else {
            console.error("Backend verification failed:", await response.text());
            setIsLoading(false); // Clear loading on backend error
            
            // Force complete sign out when backend verification fails
            setSession(null);
            setUser(null);
            setUserId(null);
            setHasUsername(null);
            setUsername(null);
            setUserRole(null);
            setAvatarUrl(null);
            
            // Sign out from Supabase completely - DO NOT navigate to dashboard
            await supabase.auth.signOut();
            
         
            if (typeof window !== 'undefined') {
              localStorage.removeItem('supabase.auth.token');
              localStorage.removeItem('sb-auth-token');
              // Also clear any other potential Supabase keys
              Object.keys(localStorage).forEach(key => {
                if (key.startsWith('sb-') || key.startsWith('supabase')) {
                  localStorage.removeItem(key);
                }
              });
              
              window.location.href = '/';
            } else {
              router.push("/"); 
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
          setUserId(null);
          setHasUsername(null);
          setUsername(null);
          setUserRole(null);
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
        setUsername(null);
        setUserId(null);
        setUserRole(null);
        setIsLoading(false); // Clear loading on sign out
      } else if (event === "TOKEN_REFRESHED" && session) {
        // Handle token refresh without redirecting
        console.log("Token refreshed, updating session state only");
        // Just update the session state, don't verify again or redirect
        setIsLoading(false);
      } else if (event === "INITIAL_SESSION" && session) {
        // Handle initial session load without redirecting if already on a page
        console.log("Initial session loaded");
        // Only clear loading, don't trigger verification again
        setIsLoading(false);
      } else {
        // For any other auth events, clear loading state
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth, router]);
  const signInWithGoogle = async () => {
    try {
      console.log("🔐 Starting Google OAuth...");
      console.log("🔐 Redirect URL will be:", `${location.origin}/api/auth/callback`);
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${location.origin}/api/auth/callback`,
          queryParams: {
            prompt: 'select_account', 
          },
        },
      });

      console.log("🔐 OAuth response:", { data, error });

      if (error) {
        console.error("❌ Sign-in error:", error);
        throw error;
      }
      
      console.log("🔐 OAuth initiated successfully, redirecting...");
    } catch (error) {
      console.error("❌ Error during Google sign-in:", error);
    }
  };

  const signOut = async () => {
    try {
     
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      

      if (currentSession?.provider_token) {
        try {
    
          await fetch(`https://oauth2.googleapis.com/revoke?token=${currentSession.provider_token}`, {
            method: 'POST',
          });
        } catch (revokeError) {
          console.warn('Failed to revoke Google token:', revokeError);
         
        }
      }
      
   
      setSession(null);
      setUser(null);
      setUserId(null);
      setHasUsername(null);
      setUsername(null);
      setUserName(null);
      setUserRole(null);
      setAvatarUrl(null);
      

      await supabase.auth.signOut();
      
    
      if (typeof window !== 'undefined') {
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('sb-') || key.startsWith('supabase') || key.includes('auth')) {
            localStorage.removeItem(key);
          }
        });
        
        localStorage.removeItem('battlecode_leaderboard');
        localStorage.removeItem('battlecode_rounds');
        localStorage.removeItem('battlecode_locks');
        

        window.location.href = '/';
      } else {
        router.push('/');
      }
    } catch (error) {
      console.error('Error signing out:', error);
      
      setSession(null);
      setUser(null);
      setUserId(null);
      setHasUsername(null);
      setUsername(null);
      setUserRole(null);
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

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/user/set-username`, {
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
      value={{ user, session, isLoading, avatarUrl, hasUsername, username, userName, userId, userRole, signInWithGoogle, signOut, updateUsername }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
