import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

const PUBLIC_BUYER_PATHS = ["/buyer/login"];
const PUBLIC_SELLER_PATHS = ["/seller/login"];
const PUBLIC_ADMIN_PATHS = ["/admin/login"];
const PUBLIC_DELIVERY_PATHS = ["/delivery/login"];

function isPublic(pathname: string, publicPaths: string[]) {
  return publicPaths.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  let section: "buyer" | "seller" | "admin" | "delivery" | null = null;
  if (pathname.startsWith("/buyer")) section = "buyer";
  else if (pathname.startsWith("/seller")) section = "seller";
  else if (pathname.startsWith("/admin")) section = "admin";
  else if (pathname.startsWith("/delivery")) section = "delivery";
  if (!section) return NextResponse.next();

  type Section = "buyer" | "seller" | "admin" | "delivery";
  const PUBLIC_PATHS: Record<Section, string[]> = {
    buyer: PUBLIC_BUYER_PATHS,
    seller: PUBLIC_SELLER_PATHS,
    admin: PUBLIC_ADMIN_PATHS,
    delivery: PUBLIC_DELIVERY_PATHS,
  };
  if (isPublic(pathname, PUBLIC_PATHS[section])) return NextResponse.next();

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;

  const loginPath = `/${section}/login`;
  const SECTION_ROLE: Record<Section, string> = {
    buyer: "BUYER",
    seller: "SELLER",
    admin: "ADMIN",
    delivery: "DELIVERY_PARTNER",
  };
  const expectedRole = SECTION_ROLE[section];

  if (!session || session.role !== expectedRole) {
    const url = req.nextUrl.clone();
    url.pathname = loginPath;
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/buyer/:path*", "/seller/:path*", "/admin/:path*", "/delivery/:path*"],
};
