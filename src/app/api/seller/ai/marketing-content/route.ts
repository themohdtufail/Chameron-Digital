import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { withApiErrors, jsonError } from "@/lib/api-utils";
import { hasFeature } from "@/lib/subscription";
import { getAIProvider } from "@/lib/ai";
import { isFeatureEnabled } from "@/lib/feature-flags";

const schema = z.object({
  occasion: z.string().trim().max(60).optional(),
  highlight: z.string().trim().max(200).optional(),
});

export const POST = withApiErrors(async (req: NextRequest) => {
  const user = await requireRole("SELLER");
  if (!(await isFeatureEnabled("ai_assistant"))) return jsonError("AI assistant is currently unavailable.", 503);
  const store = await prisma.store.findUnique({ where: { ownerId: user.id } });
  if (!store) return jsonError("Store not found", 404);
  if (!(await hasFeature(store.id, "ai"))) {
    return jsonError("AI assistant is available on the Growth plan and above. Upgrade to unlock it.", 403);
  }

  const body = schema.parse(await req.json());
  const text = await getAIProvider().generate({ kind: "marketing_content", storeName: store.name, ...body });
  return NextResponse.json({ text });
});
