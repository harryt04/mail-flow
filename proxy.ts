import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/options";

const PROTECTED_PREFIXES = ["/home", "/listen", "/settings", "/api/"];
const PUBLIC_API_PREFIXES = ["/api/auth/"];

export default auth((req) => {
  const { pathname } = req.nextUrl;

  const isPublicApi = PUBLIC_API_PREFIXES.some((p) => pathname.startsWith(p));
  const isProtected =
    !isPublicApi && PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));

  if (isProtected && !req.auth) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/", req.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/home/:path*", "/listen/:path*", "/settings/:path*", "/api/:path*"],
};
