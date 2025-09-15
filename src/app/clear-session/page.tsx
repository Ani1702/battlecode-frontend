"use client";
import { useEffect } from 'react';
import { createBrowserClient } from "@supabase/ssr";

export default function ClearSessionPage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    const clearEverything = async () => {
      try {
        console.log('Emergency session clear initiated...');
        
        // Sign out from Supabase
        await supabase.auth.signOut();
        
        // Clear ALL localStorage
        if (typeof window !== 'undefined') {
          localStorage.clear();
          sessionStorage.clear();
          
          // Also clear any potential cookies
          document.cookie.split(";").forEach(function(c) { 
            document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
          });
        }
        
        console.log('Emergency session clear completed');
        
        // Redirect to home after 2 seconds
        setTimeout(() => {
          window.location.href = '/';
        }, 2000);
        
      } catch (error) {
        console.error('Error during emergency clear:', error);
        // Force reload anyway
        setTimeout(() => {
          window.location.href = '/';
        }, 2000);
      }
    };

    clearEverything();
  }, [supabase]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <h2 className="mt-4 text-xl font-semibold text-gray-900">Clearing Session...</h2>
        <p className="mt-2 text-gray-600">Removing all authentication data. You will be redirected shortly.</p>
      </div>
    </div>
  );
}
