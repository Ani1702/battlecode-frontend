"use client";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import LoadingOverlay from "@/components/shared/LoadingOverlay";

function AuthErrorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isClearing, setIsClearing] = useState(false);
  const reason = searchParams.get("reason") || "unknown";

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const clearSessionAndRedirect = async () => {
    setIsClearing(true);
    try {
      // Sign out from Supabase
      await supabase.auth.signOut();

      // Clear all auth-related localStorage
      if (typeof window !== "undefined") {
        Object.keys(localStorage).forEach((key) => {
          if (
            key.startsWith("sb-") ||
            key.startsWith("supabase") ||
            key.includes("auth") ||
            key.includes("stuck_session")
          ) {
            localStorage.removeItem(key);
          }
        });
      }

      // Redirect to home
      router.push("/");
    } catch (error) {
      console.error("Error clearing session:", error);
      // Force reload to ensure clean state
      window.location.href = "/";
    }
  };

  const getErrorMessage = (reason: string) => {
    switch (reason) {
      case "backend_verification_failed":
        return "Authentication succeeded, but backend verification failed. This usually means the backend server rejected your credentials.";
      case "backend_connection_failed":
        return "Authentication succeeded, but we could not connect to the backend server. Please try again when the server is available.";
      case "oauth_exchange_failed":
        return "OAuth authentication failed. Please try signing in again.";
      case "no_code":
        return "No authorization code received from OAuth provider.";
      case "callback_error":
        return "An unexpected error occurred during the authentication callback.";
      default:
        return "An authentication error occurred. Please try again.";
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
            <svg
              className="h-6 w-6 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            Authentication Error
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            {getErrorMessage(reason)}
          </p>
          <div className="mt-6 space-y-3">
            <button
              onClick={clearSessionAndRedirect}
              disabled={isClearing}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isClearing
                ? "Clearing Session..."
                : "Clear Session & Return Home"}
            </button>
            <button
              onClick={() => router.push("/")}
              className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Return Home
            </button>
          </div>
          {reason === "backend_connection_failed" && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800">
                The backend server appears to be down. Please contact support or
                try again later.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense
      fallback={<LoadingOverlay isLoading={true} message="Loading..." />}
    >
      <AuthErrorContent />
    </Suspense>
  );
}
