import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { withApiErrors } from "@/lib/api-utils";

export const PATCH = withApiErrors(async (_req: Request, { params }: { params: { id: string } }) => {
  const user = await requireUser();
  await prisma.notification.updateMany({
    where: { id: params.id, userId: user.id },
    data: { isRead: true },
  });
  return NextResponse.json({ success: true });
});
