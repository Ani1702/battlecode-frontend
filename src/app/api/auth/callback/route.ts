import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get("code");

    if (code) {
      // Use cookies() directly without awaiting
      const supabase = createRouteHandlerClient({ cookies });

      // Exchange the code for a session
      await supabase.auth.exchangeCodeForSession(code);
    }    // URL to redirect to after sign in process completes
    return NextResponse.redirect(new URL("/dashboard", requestUrl.origin));
  } catch (error) {
    console.error("Auth callback error:", error);
    return NextResponse.redirect(new URL("/auth-error", request.url));
  }
}
