import { z } from "zod";

export const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[0-9]{10,15}$/, "Enter a valid mobile number");

export const otpCodeSchema = z.string().trim().regex(/^[0-9]{4,6}$/, "Enter a valid code");

export const otpRequestSchema = z.object({
  phone: phoneSchema,
  role: z.enum(["BUYER", "SELLER", "DELIVERY_PARTNER"]),
});

export const otpVerifySchema = z.object({
  phone: phoneSchema,
  code: otpCodeSchema,
  role: z.enum(["BUYER", "SELLER", "DELIVERY_PARTNER"]),
  name: z.string().trim().min(2).max(80).optional(),
  email: z.string().trim().email().optional().or(z.literal("")),
});

export const adminLoginSchema = z.object({
  phone: phoneSchema,
  password: z.string().min(6),
});

export const storeRegisterSchema = z.object({
  name: z.string().trim().min(2).max(80),
  categoryId: z.string().optional(),
  description: z.string().trim().max(500).optional(),
  phone: phoneSchema,
  email: z.string().trim().email().optional().or(z.literal("")),
  addressLine: z.string().trim().max(200).optional(),
  area: z.string().trim().max(80).optional(),
  city: z.string().trim().min(1).max(80),
  state: z.string().trim().max(80).optional(),
  logoUrl: z.string().optional(),
  coverUrl: z.string().optional(),
});

const storeHourInputSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  isClosed: z.boolean().default(false),
  openTime: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  closeTime: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
});

export const storeUpdateSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  categoryId: z.string().nullable().optional(),
  description: z.string().trim().max(500).nullable().optional(),
  phone: phoneSchema.optional(),
  email: z.string().trim().email().nullable().optional().or(z.literal("")),
  addressLine: z.string().trim().max(200).nullable().optional(),
  area: z.string().trim().max(80).nullable().optional(),
  city: z.string().trim().min(1).max(80).optional(),
  state: z.string().trim().max(80).nullable().optional(),
  logoUrl: z.string().nullable().optional(),
  coverUrl: z.string().nullable().optional(),
  openingTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  closingTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  isManuallyClosed: z.boolean().optional(),
  deliveryAvailable: z.boolean().optional(),
  deliveryFee: z.number().min(0).max(10000).optional(),
  minOrderAmount: z.number().min(0).max(10000).optional(),
  vacationMode: z.boolean().optional(),
  vacationUntil: z.string().datetime().nullable().optional(),
  hours: z.array(storeHourInputSchema).max(7).optional(),
});

export const productCategorySchema = z.object({
  name: z.string().trim().min(1).max(40),
});

export const productCategoryUpdateSchema = z.object({
  name: z.string().trim().min(1).max(40).optional(),
  isHidden: z.boolean().optional(),
  position: z.number().int().min(0).optional(),
});

const variantInputSchema = z.object({
  type: z.enum(["SIZE", "COLOR", "MATERIAL"]),
  value: z.string().trim().min(1).max(40),
  priceDelta: z.number().default(0),
  stockQuantity: z.number().int().min(0).default(0),
});

export const productSchema = z.object({
  name: z.string().trim().min(2).max(120),
  categoryId: z.string().nullable().optional(),
  description: z.string().trim().max(2000).optional(),
  sku: z.string().trim().max(60).nullable().optional(),
  price: z.number().positive(),
  discountPrice: z.number().positive().nullable().optional(),
  stockQuantity: z.number().int().min(0).default(0),
  lowStockThreshold: z.number().int().min(0).max(1000).default(5),
  trackInventory: z.boolean().default(true),
  status: z.enum(["AVAILABLE", "OUT_OF_STOCK", "HIDDEN"]).default("AVAILABLE"),
  videoUrl: z.string().nullable().optional(),
  specifications: z.record(z.string(), z.string()).optional(),
  images: z.array(z.string()).max(8).default([]),
  variants: z.array(variantInputSchema).max(20).default([]),
});

export const productRequestSchema = z.object({
  storeId: z.string().optional(),
  productName: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).optional(),
  photoUrl: z.string().trim().max(500).optional(),
  budget: z.number().positive().optional(),
  note: z.string().trim().max(300).optional(),
});

export const productRequestDecisionSchema = z.object({
  decision: z.enum(["ACCEPTED", "DECLINED"]),
});

export const productRequestRespondSchema = z.object({
  sellerAvailable: z.boolean(),
  sellerPrice: z.number().positive().nullable().optional(),
  sellerMessage: z.string().trim().max(500).optional(),
  fulfilledProductId: z.string().nullable().optional(),
});

export const inventoryAdjustSchema = z.object({
  productId: z.string(),
  variantId: z.string().nullable().optional(),
  delta: z.number().int().refine((n) => n !== 0, "Adjustment cannot be zero"),
  note: z.string().trim().max(200).optional(),
});

export const deliveryPartnerRegisterSchema = z.object({
  vehicleType: z.string().trim().max(40).optional(),
});

export const locationSchema = z.object({
  label: z.string().trim().min(1).max(40).default("Current"),
  fullName: z.string().trim().max(80).optional(),
  phone: phoneSchema.optional(),
  addressLine: z.string().trim().max(200).optional(),
  landmark: z.string().trim().max(120).optional(),
  area: z.string().trim().max(80).optional(),
  city: z.string().trim().min(1).max(80),
  state: z.string().trim().max(80).optional(),
  pincode: z.string().trim().max(12).optional(),
  country: z.string().trim().max(80).default("India"),
  deliveryInstructions: z.string().trim().max(300).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  isCurrent: z.boolean().optional(),
});
