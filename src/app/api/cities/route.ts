import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withApiErrors } from "@/lib/api-utils";

/** Active cities only — the buyer-facing city picker's data source. Inactive
 * placeholder cities (seeded ahead of actually launching there) stay hidden
 * from buyers until an admin flips them on. */
export const GET = withApiErrors(async () => {
  const cities = await prisma.city.findMany({
    where: { isActive: true },
    include: { areas: { orderBy: { name: "asc" } } },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ cities });
});
