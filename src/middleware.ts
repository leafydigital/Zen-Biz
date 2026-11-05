import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const PUBLIC_PATHS = ["/login", "/signup", "/auth/callback", "/forgot-password", "/reset-password", "/", "/app", "/login/verify", "/about-app"];

export async function middleware(request: NextRequest) {
  request.headers.set("x-pathname", request.nextUrl.pathname);
  const { response, user } = await updateSession(request);

  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some(
    (p) => path === p || path.startsWith("/auth/") || path === "/api/razorpay/webhook"
  );

  // Not signed in and trying to reach a protected page -> send to login.
  if (!user && !isPublic) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("next", path);
    return NextResponse.redirect(redirectUrl);
  }

  // Already signed in and visiting login/signup -> send to dashboard.
  if (user && (path === "/login" || path === "/signup")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
  // Note: onboarding-completion redirects are handled inside the dashboard
  // layout (server component) rather than here, since that requires a
  // profile table lookup best done with the full server client.
}

export const config = {
  matcher: [
    // Search-engine files (robots, sitemap, manifest, share image, icons) must be readable without signing in.
    "/((?!_next/static|_next/image|favicon.ico|sw.js|robots.txt|sitemap.xml|manifest.webmanifest|opengraph-image|twitter-image|icon|apple-icon|.*\\.(?:svg|png|jpg|jpeg|gif|webp|txt|xml|mp4|webm)$).*)",
  ],
};
