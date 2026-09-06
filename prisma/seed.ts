import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function placeholder(text: string, w = 800, h = 600) {
  return `https://placehold.co/${w}x${h}/eef2ff/4338ca.png?text=${encodeURIComponent(text)}`;
}

async function main() {
  console.log("Seeding Chameron Digital demo data...");

  // ---- Categories -----------------------------------------------------
  const categoryDefs = [
    { name: "Fashion", icon: "👗" },
    { name: "Food", icon: "🍔" },
    { name: "Electronics", icon: "💻" },
    { name: "Beauty", icon: "💄" },
    { name: "Furniture", icon: "🛋️" },
  ];
  const categories: Record<string, { id: string }> = {};
  for (const c of categoryDefs) {
    const category = await prisma.category.upsert({
      where: { slug: slugify(c.name) },
      update: {},
      create: { name: c.name, slug: slugify(c.name), icon: c.icon },
    });
    categories[c.name] = category;
  }

  // ---- Admin ------------------------------------------------------------
  const adminPhone = process.env.ADMIN_PHONE || "+911234567890";
  const adminPassword = process.env.ADMIN_PASSWORD || "ChameronAdmin@123";
  await prisma.user.upsert({
    where: { phone: adminPhone },
    update: {},
    create: {
      phone: adminPhone,
      role: "ADMIN",
      name: "Chameron Admin",
      passwordHash: await bcrypt.hash(adminPassword, 10),
    },
  });

  // ---- Buyer --------------------------------------------------------------
  const buyer = await prisma.user.upsert({
    where: { phone: "+919876500001" },
    update: {},
    create: { phone: "+919876500001", role: "BUYER", name: "Aisha Sharma", email: "aisha@example.com" },
  });
  await prisma.cart.upsert({ where: { userId: buyer.id }, update: {}, create: { userId: buyer.id } });
  await prisma.location.upsert({
    where: { id: `${buyer.id}-home` },
    update: {},
    create: {
      id: `${buyer.id}-home`,
      userId: buyer.id,
      label: "Current",
      city: "Jammu",
      area: "Gandhi Nagar",
      state: "Jammu and Kashmir",
      isCurrent: true,
      isDefault: true,
    },
  });

  // ---- Seller 1: Jafson Jammu (Fashion, approved) -------------------------
  const seller1 = await prisma.user.upsert({
    where: { phone: "+919876500002" },
    update: {},
    create: { phone: "+919876500002", role: "SELLER", name: "Ramesh Kumar", email: "ramesh@jafson.example" },
  });

  const store1 = await prisma.store.upsert({
    where: { ownerId: seller1.id },
    update: {},
    create: {
      ownerId: seller1.id,
      name: "Jafson Jammu",
      slug: "jafson-jammu",
      categoryId: categories["Fashion"].id,
      description: "Trendy fashion for men, women and kids — proudly local since 2010.",
      logoUrl: placeholder("Jafson", 200, 200),
      coverUrl: placeholder("Jafson Jammu", 1200, 500),
      phone: "+919876500002",
      email: "hello@jafson.example",
      addressLine: "Shop 12, Residency Road",
      area: "Gandhi Nagar",
      city: "Jammu",
      state: "Jammu and Kashmir",
      latitude: 32.7266,
      longitude: 74.857,
      status: "APPROVED",
      ratingAvg: 4.8,
      ratingCount: 132,
      deliveryFee: 30,
    },
  });

  // Note: "Offers" is intentionally not a category — it's a built-in filter
  // tab (any discounted product) in the store browser, not seller-managed.
  const store1Categories: Record<string, { id: string }> = {};
  for (const name of ["Men", "Women", "Kids"]) {
    const cat = await prisma.productCategory.upsert({
      where: { storeId_slug: { storeId: store1.id, slug: slugify(name) } },
      update: {},
      create: { storeId: store1.id, name, slug: slugify(name) },
    });
    store1Categories[name] = cat;
  }

  const fashionProducts = [
    { name: "Classic Cotton Shirt", category: "Men", price: 1299, discountPrice: 999, sizes: ["S", "M", "L", "XL"] },
    { name: "Slim Fit Denim Jeans", category: "Men", price: 1999, discountPrice: null, sizes: ["30", "32", "34", "36"] },
    { name: "Floral Summer Dress", category: "Women", price: 1799, discountPrice: 1399, sizes: ["S", "M", "L"] },
    { name: "Embroidered Kurti", category: "Women", price: 1499, discountPrice: null, sizes: ["S", "M", "L", "XL"] },
    { name: "Kids Graphic T-Shirt", category: "Kids", price: 599, discountPrice: 449, sizes: ["3-4Y", "5-6Y", "7-8Y"] },
    { name: "Winter Wool Sweater", category: "Men", price: 2199, discountPrice: 1599, sizes: ["M", "L", "XL"] },
  ];

  for (const p of fashionProducts) {
    const existing = await prisma.product.findUnique({
      where: { slug: slugify(p.name) },
    });
    if (existing) continue;
    await prisma.product.create({
      data: {
        storeId: store1.id,
        categoryId: store1Categories[p.category].id,
        name: p.name,
        slug: slugify(p.name),
        description: `${p.name} — premium quality fabric, tailored for everyday comfort.`,
        price: p.price,
        discountPrice: p.discountPrice ?? undefined,
        stockQuantity: 50,
        status: "AVAILABLE",
        specifications: { Fabric: "Cotton blend", Care: "Machine wash cold" },
        images: { create: [{ url: placeholder(p.name), position: 0 }] },
        variants: {
          create: p.sizes.map((size) => ({ type: "SIZE", value: size, priceDelta: 0, stockQuantity: 15 })),
        },
      },
    });
  }

  // ---- Seller 2: Spice Junction (Food, approved) -------------------------
  const seller2 = await prisma.user.upsert({
    where: { phone: "+919876500003" },
    update: {},
    create: { phone: "+919876500003", role: "SELLER", name: "Priya Verma", email: "priya@spicejunction.example" },
  });

  const store2 = await prisma.store.upsert({
    where: { ownerId: seller2.id },
    update: {},
    create: {
      ownerId: seller2.id,
      name: "Spice Junction",
      slug: "spice-junction",
      categoryId: categories["Food"].id,
      description: "Authentic North Indian home-style food, made fresh daily.",
      logoUrl: placeholder("Spice Junction", 200, 200),
      coverUrl: placeholder("Spice Junction", 1200, 500),
      phone: "+919876500003",
      addressLine: "14 Bahu Plaza",
      area: "Bahu Plaza",
      city: "Jammu",
      state: "Jammu and Kashmir",
      latitude: 32.719,
      longitude: 74.864,
      status: "APPROVED",
      ratingAvg: 4.5,
      ratingCount: 87,
      deliveryFee: 20,
    },
  });

  for (const name of ["Starters", "Main Course", "Beverages"]) {
    await prisma.productCategory.upsert({
      where: { storeId_slug: { storeId: store2.id, slug: slugify(name) } },
      update: {},
      create: { storeId: store2.id, name, slug: slugify(name) },
    });
  }
  const mainCourse = await prisma.productCategory.findFirst({ where: { storeId: store2.id, slug: "main-course" } });

  const foodProducts = [
    { name: "Butter Chicken", price: 349, discountPrice: null },
    { name: "Paneer Tikka Masala", price: 299, discountPrice: 249 },
    { name: "Dal Makhani", price: 219, discountPrice: null },
  ];
  for (const p of foodProducts) {
    const existing = await prisma.product.findUnique({
      where: { slug: slugify(p.name) },
    });
    if (existing) continue;
    await prisma.product.create({
      data: {
        storeId: store2.id,
        categoryId: mainCourse?.id,
        name: p.name,
        slug: slugify(p.name),
        description: `${p.name}, served hot with a side of fresh naan.`,
        price: p.price,
        discountPrice: p.discountPrice ?? undefined,
        stockQuantity: 100,
        status: "AVAILABLE",
        images: { create: [{ url: placeholder(p.name), position: 0 }] },
      },
    });
  }

  // ---- Seller 3: pending approval (for admin demo) ------------------------
  const seller3 = await prisma.user.upsert({
    where: { phone: "+919876500004" },
    update: {},
    create: { phone: "+919876500004", role: "SELLER", name: "Vikram Singh" },
  });
  const store3 = await prisma.store.upsert({
    where: { ownerId: seller3.id },
    update: {},
    create: {
      ownerId: seller3.id,
      name: "TechHub Electronics",
      slug: "techhub-electronics",
      categoryId: categories["Electronics"].id,
      description: "Latest gadgets and accessories at honest prices.",
      phone: "+919876500004",
      addressLine: "Shop 3, Trikuta Nagar",
      area: "Trikuta Nagar",
      city: "Jammu",
      state: "Jammu and Kashmir",
      status: "PENDING",
    },
  });

  // ---- Subscription plans -------------------------------------------------
  const planDefs = [
    {
      key: "STARTER",
      name: "Starter",
      priceMonthly: 0,
      features: { maxProducts: 20, ai: false, whatsappTemplates: false, advancedAnalytics: false },
    },
    {
      key: "GROWTH",
      name: "Growth",
      priceMonthly: 999,
      features: { maxProducts: 200, ai: true, whatsappTemplates: true, advancedAnalytics: false },
    },
    {
      key: "PREMIUM",
      name: "Premium",
      priceMonthly: 2499,
      features: { maxProducts: null, ai: true, whatsappTemplates: true, advancedAnalytics: true },
    },
  ];
  const plans: Record<string, { id: string }> = {};
  for (const p of planDefs) {
    plans[p.key] = await prisma.subscriptionPlan.upsert({
      where: { key: p.key },
      update: {},
      create: p,
    });
  }

  const oneYear = 365 * 24 * 60 * 60 * 1000;
  const twoWeeks = 14 * 24 * 60 * 60 * 1000;
  await prisma.sellerSubscription.upsert({
    where: { storeId: store1.id },
    update: {},
    create: { storeId: store1.id, planId: plans["PREMIUM"].id, status: "ACTIVE", expiryDate: new Date(Date.now() + oneYear) },
  });
  await prisma.sellerSubscription.upsert({
    where: { storeId: store2.id },
    update: {},
    create: { storeId: store2.id, planId: plans["GROWTH"].id, status: "ACTIVE", expiryDate: new Date(Date.now() + oneYear) },
  });
  await prisma.sellerSubscription.upsert({
    where: { storeId: store3.id },
    update: {},
    create: { storeId: store3.id, planId: plans["GROWTH"].id, status: "TRIAL", expiryDate: new Date(Date.now() + twoWeeks) },
  });

  // ---- Notification templates -------------------------------------------
  // {{placeholder}} tokens rendered by renderTemplate() (src/lib/notify.ts).
  // IN_APP rows back createNotification()'s templateKey; the matching
  // "<key>_whatsapp" row also triggers the WhatsApp seam for that event.
  const notificationTemplateDefs: { key: string; channel: "IN_APP" | "WHATSAPP"; title: string; body: string }[] = [
    { key: "order_placed", channel: "IN_APP", title: "Order placed", body: "Your order {{orderNumber}} from {{storeName}} has been placed for {{amount}}." },
    { key: "order_placed_whatsapp", channel: "WHATSAPP", title: "Order placed", body: "Hi! Your order {{orderNumber}} from {{storeName}} has been placed for {{amount}}. We'll keep you posted." },
    { key: "new_order", channel: "IN_APP", title: "New order received", body: "{{customerName}} placed order {{orderNumber}} for {{amount}}." },
    { key: "new_order_whatsapp", channel: "WHATSAPP", title: "New order received", body: "New order alert! {{customerName}} just placed order {{orderNumber}} for {{amount}}." },
    { key: "order_confirmed", channel: "IN_APP", title: "Order confirmed", body: "Your order {{orderNumber}} from {{storeName}} is now confirmed." },
    { key: "order_confirmed_whatsapp", channel: "WHATSAPP", title: "Order confirmed", body: "Good news! Your order {{orderNumber}} from {{storeName}} has been confirmed." },
    { key: "order_preparing", channel: "IN_APP", title: "Order being prepared", body: "Your order {{orderNumber}} from {{storeName}} is being prepared." },
    { key: "order_preparing_whatsapp", channel: "WHATSAPP", title: "Order being prepared", body: "Your order {{orderNumber}} from {{storeName}} is being prepared now." },
    { key: "order_shipped", channel: "IN_APP", title: "Order out for delivery", body: "Your order {{orderNumber}} from {{storeName}} is out for delivery." },
    { key: "order_shipped_whatsapp", channel: "WHATSAPP", title: "Order out for delivery", body: "Your order {{orderNumber}} from {{storeName}} is on its way!" },
    { key: "order_delivered", channel: "IN_APP", title: "Order delivered", body: "Your order {{orderNumber}} from {{storeName}} has been delivered." },
    { key: "order_delivered_whatsapp", channel: "WHATSAPP", title: "Order delivered", body: "Your order {{orderNumber}} from {{storeName}} has been delivered. Enjoy!" },
    { key: "order_cancelled", channel: "IN_APP", title: "Order cancelled", body: "Order {{orderNumber}} was cancelled by the buyer.{{reason}}" },
    { key: "order_cancelled_whatsapp", channel: "WHATSAPP", title: "Order cancelled", body: "Order {{orderNumber}} was cancelled by the buyer.{{reason}}" },
    { key: "payment_received", channel: "IN_APP", title: "Payment received", body: "Payment of {{amount}} received for order {{orderNumber}}." },
    { key: "payment_received_whatsapp", channel: "WHATSAPP", title: "Payment received", body: "Payment of {{amount}} received for your order {{orderNumber}}." },
    { key: "low_stock", channel: "IN_APP", title: "Product running low", body: "{{productName}} is down to {{stock}} unit(s) — below your threshold of {{threshold}}." },
    { key: "low_stock_whatsapp", channel: "WHATSAPP", title: "Product running low", body: "Heads up: {{productName}} is down to {{stock}} unit(s), below your threshold of {{threshold}}." },
  ];
  for (const t of notificationTemplateDefs) {
    await prisma.notificationTemplate.upsert({
      where: { key: t.key },
      update: {},
      create: t,
    });
  }

  console.log("Seed complete.");
  console.log("----------------------------------------------------");
  console.log(`Admin login:  ${adminPhone} / ${adminPassword}`);
  console.log("Buyer OTP login:  +919876500001 (Aisha Sharma)");
  console.log("Seller OTP login: +919876500002 (Jafson Jammu, approved)");
  console.log("Seller OTP login: +919876500003 (Spice Junction, approved)");
  console.log("Seller OTP login: +919876500004 (TechHub Electronics, pending)");
  console.log("OTP dev code (when OTP_DEV_MODE=true): 123456");
  console.log("----------------------------------------------------");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
