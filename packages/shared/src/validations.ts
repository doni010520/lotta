import { z } from "zod";

export const addressSchema = z.object({
  street: z.string().optional(),
  number: z.string().optional(),
  complement: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
});

export const createRestaurantSchema = z.object({
  name: z.string().min(2).max(100),
  slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  document: z.string().optional(),
  address: addressSchema.optional(),
});

export const updateRestaurantSchema = createRestaurantSchema.partial().extend({
  logo_url: z.string().url().optional().nullable(),
  is_open: z.boolean().optional(),
  auto_accept: z.boolean().optional(),
  min_order: z.number().min(0).optional(),
  avg_prep_time: z.number().int().min(1).optional(),
});

export const createCategorySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional().nullable(),
  sort_order: z.number().int().min(0).optional(),
  is_active: z.boolean().optional(),
});

export const updateCategorySchema = createCategorySchema.partial();

export const createProductSchema = z.object({
  category_id: z.string().uuid().optional().nullable(),
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional().nullable(),
  price: z.number().min(0),
  promo_price: z.number().min(0).optional().nullable(),
  image_url: z.string().url().optional().nullable(),
  is_active: z.boolean().optional(),
  sort_order: z.number().int().min(0).optional(),
  prep_time: z.number().int().min(0).optional().nullable(),
  serves: z.number().int().min(1).optional(),
  tags: z.array(z.string()).optional(),
});

export const updateProductSchema = createProductSchema.partial();

export const createOptionGroupSchema = z.object({
  product_id: z.string().uuid(),
  name: z.string().min(1).max(100),
  min_select: z.number().int().min(0).optional(),
  max_select: z.number().int().min(1).optional(),
  is_required: z.boolean().optional(),
  sort_order: z.number().int().min(0).optional(),
});

export const createOptionSchema = z.object({
  option_group_id: z.string().uuid(),
  name: z.string().min(1).max(100),
  price: z.number().min(0).optional(),
  is_active: z.boolean().optional(),
  sort_order: z.number().int().min(0).optional(),
});

export const createDeliveryZoneSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(["radius", "zip_list"]),
  radius_km: z.number().min(0.1).optional().nullable(),
  zip_codes: z.array(z.string()).optional(),
  fee: z.number().min(0),
  min_order: z.number().min(0).optional(),
  estimated_min: z.number().int().min(1).optional(),
  is_active: z.boolean().optional(),
  sort_order: z.number().int().min(0).optional(),
});

export const updateDeliveryZoneSchema = createDeliveryZoneSchema.partial();

export const createOperatingHourSchema = z.object({
  day_of_week: z.number().int().min(0).max(6),
  open_time: z.string().regex(/^\d{2}:\d{2}$/),
  close_time: z.string().regex(/^\d{2}:\d{2}$/),
  is_active: z.boolean().optional(),
});

export const createPaymentConfigSchema = z.object({
  gateway: z.enum(["mercadopago", "asaas", "stripe", "pagseguro", "manual"]),
  credentials: z.record(z.unknown()).optional(),
  accepts_pix: z.boolean().optional(),
  accepts_card: z.boolean().optional(),
  accepts_cash: z.boolean().optional(),
  accepts_card_delivery: z.boolean().optional(),
});

export type CreateRestaurant = z.infer<typeof createRestaurantSchema>;
export type UpdateRestaurant = z.infer<typeof updateRestaurantSchema>;
export type CreateCategory = z.infer<typeof createCategorySchema>;
export type UpdateCategory = z.infer<typeof updateCategorySchema>;
export type CreateProduct = z.infer<typeof createProductSchema>;
export type UpdateProduct = z.infer<typeof updateProductSchema>;
export type CreateOptionGroup = z.infer<typeof createOptionGroupSchema>;
export type CreateOption = z.infer<typeof createOptionSchema>;
export type CreateDeliveryZone = z.infer<typeof createDeliveryZoneSchema>;
export type UpdateDeliveryZone = z.infer<typeof updateDeliveryZoneSchema>;
export type CreateOperatingHour = z.infer<typeof createOperatingHourSchema>;
export type CreatePaymentConfig = z.infer<typeof createPaymentConfigSchema>;
