"use client";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

export default function Protected({ children }: { children: React.ReactNode }) {
  const { user, session, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Only redirect if we're completely done loading AND have no user AND no session
    if (!isLoading && !user && !session && (pathname !== "/")) {
      console.log("Protected: Redirecting to home - no user or session");
      router.push("/");
    }
  }, [user, session, isLoading, router, pathname]);

  if (pathname === "/"){
    return <>{children}</>
  }

  // Show loading if we're still loading OR if we have a session but no user yet (verification in progress)
  if (isLoading || (!user && session)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Only show "not authorized" if we have no session and no user
  if (!user && !session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Not authorized. Redirecting...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
