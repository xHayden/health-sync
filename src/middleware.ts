// middleware.js
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Public routes pass straight through
  if (pathname.startsWith("/login") || pathname.startsWith("/public")) {
    return NextResponse.next();
  }

  // 2. Session check (Edge-compatible getToken)
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.redirect(new URL("/login", req.url));

  // 3. Clone headers so we can mutate
  const headers = new Headers(req.headers);
  headers.set("x-user-id", String(token.id ?? ""));

  // 4. Optional resource-ownership gate
  if (
    pathname.startsWith("/api/v1/") &&
    !pathname.startsWith("/api/v1/users")
  ) {
    const sessionUserId = String(token.id ?? "");
    let owns = true;

    // 4a. Query-string check
    const qsUserId = req.nextUrl.searchParams.get("userId");
    if (qsUserId) {
      owns = qsUserId === sessionUserId;
    }
    // 4b. For non-GET, peek at JSON body **after cloning**
    else if (req.method !== "GET") {
      try {
        const body = await req.clone().json();
        owns = !body?.userId || body.userId.toString() === sessionUserId;
      } catch {
        owns = false;
      }
    }
    headers.set("x-user-owns-resource", String(owns));
  }

  // 5. Forward the request with mutated headers
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: [
    // pages
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
    // api (except /api/v1/users)
    "/api/v1/:path((?!(?:users|sync)).*)",
  ],
};