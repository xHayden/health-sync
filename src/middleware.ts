// middleware.js
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/login") || pathname.startsWith("/public")) {
    return NextResponse.next();
  }

  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });
  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // 3) clone headers so we can inject our flag
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-user-id', (token.id ?? '') as string);
  // 4) resource-ownership check ONLY on /api/v1/* except /api/v1/users
  if (
    pathname.startsWith("/api/v1/") &&
    !pathname.startsWith("/api/v1/users")
  ) {
    // use whichever claim holds your userId
    const sessionUserId = token.id?.toString();

    let owns = false;

    // a) look for ?userId=...
    const q = req.nextUrl.searchParams.get("userId");
    if (q) {
      owns = q === sessionUserId;
    }
    // b) else, on non-GET requests, try to parse JSON body
    else if (req.method !== "GET") {
      try {
        const body = await req.json();
        if (body?.userId) {
          owns = body.userId.toString() === sessionUserId;
        } else {
          // no userId to check → default to true
          owns = true;
        }
      } catch {
        // if parse fails, play safe and deny
        owns = false;
      }
    } else {
      // GET with no userId param → OK
      owns = true;
    }

    // inject a single source-of-truth header
    requestHeaders.set("x-user-owns-resource", owns.toString());
    }

  // 5) forward the (possibly) modified request into your API/next handler
  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: [
    // your old page matcher:
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
    // + run on /api/v1/* except /api/v1/users
    "/api/v1/:path((?!users).*)",
  ],
  // runtime: 'nodejs'
};