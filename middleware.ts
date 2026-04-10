import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

const PUBLIC_PATHS = ["/login", "/api/auth/"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Start with a passthrough response so we can attach refreshed cookies to it
  let response = NextResponse.next({ request });

  // Create a Supabase client wired to the middleware request/response cookies.
  // This is required so Supabase can silently refresh an expired access token.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Write updated cookies back onto the request first so subsequent
          // getAll() calls in the same middleware run see them.
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          // Re-create the response so it carries the new cookie headers.
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getUser() validates the JWT with Supabase and refreshes it when needed.
  // Always use getUser() — never getSession() — in middleware (security requirement).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  // Unauthenticated user trying to access a protected route → redirect to login
  if (!user && !isPublic) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Authenticated user visiting /login → send them to the dashboard
  if (user && pathname.startsWith("/login")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    // Run on all routes except Next.js internals and static files
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
