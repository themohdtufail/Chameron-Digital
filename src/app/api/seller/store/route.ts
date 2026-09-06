import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { storeRegisterSchema, storeUpdateSchema } from "@/lib/validation";
import { withApiErrors, jsonError } from "@/lib/api-utils";
import { slugify } from "@/lib/utils";

export const GET = withApiErrors(async () => {
  const user = await requireRole("SELLER");
  const store = await prisma.store.findUnique({
    where: { ownerId: user.id },
    include: { category: true, hours: true },
  });
  return NextResponse.json({ store });
});

async function uniqueSlug(base: string) {
  const slug = slugify(base) || "store";
  let candidate = slug;
  let n = 1;
  while (await prisma.store.findUnique({ where: { slug: candidate } })) {
    candidate = `${slug}-${++n}`;
  }
  return candidate;
}

export const POST = withApiErrors(async (req: NextRequest) => {
  const user = await requireRole("SELLER");

  const existing = await prisma.store.findUnique({ where: { ownerId: user.id } });
  if (existing) return jsonError("You already have a store", 409);

  const body = storeRegisterSchema.parse(await req.json());
  const slug = await uniqueSlug(body.name);

  const store = await prisma.store.create({
    data: {
      ownerId: user.id,
      name: body.name,
      slug,
      categoryId: body.categoryId || undefined,
      description: body.description,
      phone: body.phone,
      email: body.email || undefined,
      addressLine: body.addressLine,
      area: body.area,
      city: body.city,
      state: body.state,
      logoUrl: body.logoUrl,
      coverUrl: body.coverUrl,
    },
  });

  // Note: "Offers" is intentionally not a default category — it's a built-in
  // filter tab (any discounted product) shown separately in the store browser.
  const defaultCategories = ["Men", "Women", "Kids"];
  await prisma.productCategory.createMany({
    data: defaultCategories.map((name) => ({ storeId: store.id, name, slug: slugify(name) })),
  });

  // New sellers get a 14-day GROWTH trial so they can try AI/WhatsApp
  // features before committing to a paid plan.
  const growthPlan = await prisma.subscriptionPlan.findUnique({ where: { key: "GROWTH" } });
  if (growthPlan) {
    await prisma.sellerSubscription.create({
      data: {
        storeId: store.id,
        planId: growthPlan.id,
        status: "TRIAL",
        expiryDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      },
    });
  }

  return NextResponse.json({ store });
});

export const PATCH = withApiErrors(async (req: NextRequest) => {
  const user = await requireRole("SELLER");
  const store = await prisma.store.findUnique({ where: { ownerId: user.id } });
  if (!store) return jsonError("Store not found", 404);

  const { hours, ...body } = storeUpdateSchema.parse(await req.json());

  const updated = await prisma.$transaction(async (tx) => {
    if (hours) {
      for (const h of hours) {
        await tx.storeHours.upsert({
          where: { storeId_dayOfWeek: { storeId: store.id, dayOfWeek: h.dayOfWeek } },
          update: { isClosed: h.isClosed, openTime: h.openTime ?? undefined, closeTime: h.closeTime ?? undefined },
          create: {
            storeId: store.id,
            dayOfWeek: h.dayOfWeek,
            isClosed: h.isClosed,
            openTime: h.openTime ?? undefined,
            closeTime: h.closeTime ?? undefined,
          },
        });
      }
    }

    return tx.store.update({
      where: { id: store.id },
      data: {
        ...body,
        email: body.email === "" ? null : body.email,
        vacationUntil: body.vacationUntil === null ? null : body.vacationUntil ? new Date(body.vacationUntil) : undefined,
      },
      include: { hours: true },
    });
  });

  return NextResponse.json({ store: updated });
});
