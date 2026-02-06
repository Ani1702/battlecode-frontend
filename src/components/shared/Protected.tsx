"use client";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import LoadingOverlay from "@/components/shared/LoadingOverlay";

export default function Protected({ children }: { children: React.ReactNode }) {
  const { user, session, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Only redirect if we're completely done loading AND have no user AND no session
    if (!isLoading && !user && !session && (pathname !== "/")) {

      router.push("/");
    }
  }, [user, session, isLoading, router, pathname]);

  if (pathname === "/"){
    return <>{children}</>
  }

  // Show loading if we're still loading OR if we have a session but no user yet (verification in progress)
  if (isLoading || (!user && session)) {
    return <LoadingOverlay isLoading={true} message="Verifying authentication..." />;
  }

  // Only show "not authorized" if we have no session and no user
  if (!user && !session) {
    return <LoadingOverlay isLoading={true} message="Not authorized. Redirecting..." />;
  }

  return <>{children}</>;
}
