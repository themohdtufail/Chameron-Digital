import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { withApiErrors, jsonError } from "@/lib/api-utils";
import { hasFeature } from "@/lib/subscription";
import { getAIProvider } from "@/lib/ai";
import { isFeatureEnabled } from "@/lib/feature-flags";

const schema = z.object({
  name: z.string().trim().min(1).max(120),
  category: z.string().trim().max(60).optional(),
  price: z.number().positive(),
  attributes: z.record(z.string(), z.string()).optional(),
});

export const POST = withApiErrors(async (req: NextRequest) => {
  const user = await requireRole("SELLER");
  if (!(await isFeatureEnabled("ai_assistant"))) return jsonError("AI assistant is currently unavailable.", 503);
  const store = await prisma.store.findUnique({ where: { ownerId: user.id } });
  if (!store) return jsonError("Store not found", 404);
  if (!(await hasFeature(store.id, "ai"))) {
    return jsonError("AI assistant is available on the Growth plan and above. Upgrade to unlock it.", 403);
  }

  const product = schema.parse(await req.json());
  const text = await getAIProvider().generate({ kind: "product_description", product });
  return NextResponse.json({ text });
});
