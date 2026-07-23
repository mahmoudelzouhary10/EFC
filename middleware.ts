import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  try {
    return await updateSession(request);
  } catch (e) {
    // Never let an auth hiccup take down the whole site.
    // Public pages keep working; admin pages fall back to the login screen.
    console.error("middleware error:", e);
    if (request.nextUrl.pathname.startsWith("/admin/dashboard")) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }
}

// Only run on admin routes — public standings/fixtures never need auth.
export const config = {
  matcher: ["/admin/:path*"],
};
