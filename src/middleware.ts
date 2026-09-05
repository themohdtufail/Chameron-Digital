import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

const PUBLIC_BUYER_PATHS = ["/buyer/login"];
const PUBLIC_SELLER_PATHS = ["/seller/login"];
const PUBLIC_ADMIN_PATHS = ["/admin/login"];

function isPublic(pathname: string, publicPaths: string[]) {
  return publicPaths.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  let section: "buyer" | "seller" | "admin" | null = null;
  if (pathname.startsWith("/buyer")) section = "buyer";
  else if (pathname.startsWith("/seller")) section = "seller";
  else if (pathname.startsWith("/admin")) section = "admin";
  if (!section) return NextResponse.next();

  const publicPaths =
    section === "buyer" ? PUBLIC_BUYER_PATHS : section === "seller" ? PUBLIC_SELLER_PATHS : PUBLIC_ADMIN_PATHS;
  if (isPublic(pathname, publicPaths)) return NextResponse.next();

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;

  const loginPath = `/${section}/login`;
  const expectedRole = section.toUpperCase();

  if (!session || session.role !== expectedRole) {
    const url = req.nextUrl.clone();
    url.pathname = loginPath;
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/buyer/:path*", "/seller/:path*", "/admin/:path*"],
};
