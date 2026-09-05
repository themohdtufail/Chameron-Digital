import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { withApiErrors } from "@/lib/api-utils";

export const GET = withApiErrors(async () => {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ user: null });

  return NextResponse.json({
    user: {
      id: user.id,
      role: user.role,
      name: user.name,
      phone: user.phone,
      email: user.email,
      avatarUrl: user.avatarUrl,
      hasStore: Boolean(user.store),
      storeStatus: user.store?.status ?? null,
      storeSlug: user.store?.slug ?? null,
    },
  });
});
