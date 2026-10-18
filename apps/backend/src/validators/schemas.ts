import { z } from "zod";

export const conditionEnum = z.enum(["new", "like_new", "good", "fair"]);
export const listingTypeEnum = z.enum(["sale", "rental", "borrow"]);

export const idSchema = z.coerce.number().int().positive();

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password must be at most 72 characters")
    .regex(/[A-Za-z]/, "Password must contain a letter")
    .regex(/\d/, "Password must contain a digit"),
  fullName: z.string().trim().min(2).max(100),
  regNo: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^\d{2}[A-Z]{3}\d{4,5}$/, "Registration number looks invalid")
    .optional(),
  phone: z.string().trim().max(20).optional(),
  hostelBlock: z.string().trim().max(60).optional(),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(72),
});

const listingFields = z.object({
  categoryId: z.number().int().positive(),
  locationId: z.number().int().positive().nullish(),
  title: z.string().trim().min(3).max(150),
  description: z.string().trim().max(5000).default(""),
  condition: conditionEnum,
  listingType: listingTypeEnum,
  price: z.number().min(0).max(1_000_000).nullish(),
  deposit: z.number().min(0).max(1_000_000).nullish(),
  rentalUnit: z.enum(["day", "week", "month"]).nullish(),
  imageUrls: z.regex(/^(https?:\/\/|\/api\/uploads\/)/, "Invalid image URL"),
});

export const listingSchema = listingFields.superRefine((v, ctx) => {
  const bad = (path: string, message: string) => ctx.addIssue({ code: "custom", path: [path], message });
  if (v.listingType === "sale") {
    if (v.price == null) bad("price", "Price is required for sale listings");
    if (v.rentalUnit != null) bad("rentalUnit", "Rental unit is only for rentals");
    if (v.deposit != null) bad("deposit", "Deposit is only for rentals and borrowing");
  } else if (v.listingType === "rental") {
    if (v.price == null || v.price <= 0) bad("price", "Rentals need a price above 0");
    if (v.rentalUnit == null) bad("rentalUnit", "Rental unit is required for rentals");
  } else {
    if (v.price != null) bad("price", "Borrow listings are free, leave price empty");
    if (v.rentalUnit != null) bad("rentalUnit", "Rental unit is not used for borrowing");
  }
});
export type ListingInput = z.infer<typeof listingSchema>;

export const listingQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  category: z.string().trim().max(60).optional(),
  type: listingTypeEnum.optional(),
  condition: conditionEnum.optional(),
  locationId: z.coerce.number().int().positive().optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  postedAfter: z.coerce.date().optional(),
  sort: z.enum(["newest", "price_asc", "price_desc", "relevance"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(12),
});
export type ListingQuery = z.infer<typeof listingQuerySchema>;

export const purchaseRequestSchema = z.object({
  message: z.string().trim().max(500).optional(),
});