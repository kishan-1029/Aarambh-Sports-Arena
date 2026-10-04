import { z } from 'zod';
import { ORDER_STATUSES, PAYMENT_METHODS, PAYMENT_STATUSES } from './order.model.js';
import { MOVEMENT_TYPES } from './inventoryMovement.model.js';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id');
const paise = z.number().int().min(0);

export const idParamsSchema = z.object({ id: objectId });
export const slugParamsSchema = z.object({ slug: z.string().min(1).max(120) });
export const orderNumberParamsSchema = z.object({ orderNumber: z.string().min(3).max(40) });

// ──────────────────────────── Categories ────────────────────────────

export const categoryCreateSchema = z.object({
  name: z.string().min(1).max(120),
  slug: z.string().max(120).optional(),
  description: z.string().max(1000).optional(),
  image: z.string().max(500).optional(),
  icon: z.string().max(60).optional(),
  active: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export const categoryUpdateSchema = categoryCreateSchema.partial();

// ──────────────────────────── Products ────────────────────────────

const variantSchema = z.object({
  _id: objectId.optional(),
  sku: z.string().min(1).max(60).optional(),
  name: z.string().max(120).optional(),
  size: z.string().max(40).optional(),
  colour: z.string().max(40).optional(),
  additionalPricePaise: z.number().int().optional(),
  stockQuantity: z.number().int().min(0).optional(),
  lowStockThreshold: z.number().int().min(0).nullable().optional(),
  active: z.boolean().optional(),
});

const imageSchema = z.object({
  _id: objectId.optional(),
  url: z.string().min(1).max(500),
  altText: z.string().max(200).optional(),
  sortOrder: z.number().int().optional(),
  isPrimary: z.boolean().optional(),
});

export const productCreateSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().max(120).optional(),
  sku: z.string().min(1).max(60),
  categoryId: objectId,
  brand: z.string().max(120).optional(),
  shortDescription: z.string().max(300).optional(),
  description: z.string().max(5000).optional(),
  sellingPricePaise: paise,
  mrpPaise: paise.optional(),
  costPricePaise: paise.optional(),
  taxRatePct: z.number().min(0).max(100).optional(),
  trackInventory: z.boolean().optional(),
  stockQuantity: z.number().int().min(0).optional(),
  lowStockThreshold: z.number().int().min(0).optional(),
  hasVariants: z.boolean().optional(),
  variants: z.array(variantSchema).max(50).optional(),
  images: z.array(imageSchema).max(10).optional(),
  memberDiscountEligible: z.boolean().optional(),
  fulfillment: z
    .object({ pickup: z.boolean().optional(), delivery: z.boolean().optional() })
    .optional(),
  featured: z.boolean().optional(),
  active: z.boolean().optional(),
});

export const productUpdateSchema = productCreateSchema.partial();

export const productArchiveSchema = z.object({ archived: z.boolean() });

// ──────────────────────────── Inventory ────────────────────────────

export const stockInSchema = z.object({
  productId: objectId,
  variantId: objectId.nullable().optional(),
  quantity: z.number().int().positive(),
  reason: z.string().max(300).optional(),
});

export const stockAdjustSchema = z.object({
  productId: objectId,
  variantId: objectId.nullable().optional(),
  newQuantity: z.number().int().min(0),
  reason: z.string().min(1).max(300),
});

export const movementQuerySchema = z
  .object({
    productId: objectId.optional(),
    variantId: objectId.optional(),
    type: z.enum(MOVEMENT_TYPES).optional(),
    referenceId: z.string().max(60).optional(),
  })
  .passthrough();

// ──────────────────────────── Cart ────────────────────────────

export const cartAddSchema = z.object({
  productId: objectId,
  variantId: objectId.nullable().optional(),
  quantity: z.number().int().min(1).max(20).optional(),
});

export const cartItemParamsSchema = z.object({ itemId: objectId });

export const cartUpdateSchema = z.object({
  quantity: z.number().int().min(0).max(20),
});

export const cartMergeSchema = z.object({
  items: z
    .array(
      z.object({
        productId: objectId,
        variantId: objectId.nullable().optional(),
        quantity: z.number().int().min(1).max(20),
      }),
    )
    .max(50),
});

// ──────────────────────────── Checkout / orders ────────────────────────────

export const addressSchema = z.object({
  fullName: z.string().min(1).max(120),
  phone: z.string().min(6).max(20),
  line1: z.string().min(1).max(200),
  line2: z.string().max(200).optional(),
  area: z.string().max(120).optional(),
  city: z.string().min(1).max(120),
  state: z.string().min(1).max(120),
  postalCode: z.string().min(4).max(10),
  landmark: z.string().max(200).optional(),
});

export const checkoutSchema = z.object({
  fulfillmentType: z.enum(['pickup', 'delivery']),
  paymentMethod: z.enum(PAYMENT_METHODS),
  deliveryAddress: addressSchema.nullable().optional(),
  customerNote: z.string().max(1000).optional(),
  contact: z
    .object({
      name: z.string().max(120).optional(),
      phone: z.string().max(20).optional(),
      email: z.string().max(200).optional(),
    })
    .optional(),
});

export const checkoutQuoteSchema = z
  .object({
    fulfillmentType: z.enum(['pickup', 'delivery']).optional(),
  })
  .passthrough();

export const orderStatusSchema = z.object({
  status: z.enum(ORDER_STATUSES),
  note: z.string().max(500).optional(),
});

export const orderPaymentSchema = z.object({
  status: z.enum(PAYMENT_STATUSES),
  reference: z.string().max(120).optional(),
  amountPaise: paise.optional(),
});

export const orderCancelSchema = z.object({
  reason: z.string().max(500).optional(),
});

export const orderNoteSchema = z.object({
  note: z.string().max(2000),
});

export const publicProductQuerySchema = z
  .object({
    category: z.string().max(120).optional(),
    brand: z.string().max(120).optional(),
    q: z.string().max(120).optional(),
    sort: z.enum(['featured', 'price_asc', 'price_desc', 'newest', 'name']).optional(),
    availability: z.enum(['all', 'in_stock']).optional(),
    featured: z.string().optional(),
    minPricePaise: z.coerce.number().int().min(0).optional(),
    maxPricePaise: z.coerce.number().int().min(0).optional(),
    page: z.coerce.number().int().min(1).optional(),
    pageSize: z.coerce.number().int().min(1).max(60).optional(),
  })
  .passthrough();

export default {
  idParamsSchema,
  slugParamsSchema,
  orderNumberParamsSchema,
  categoryCreateSchema,
  categoryUpdateSchema,
  productCreateSchema,
  productUpdateSchema,
  productArchiveSchema,
  stockInSchema,
  stockAdjustSchema,
  movementQuerySchema,
  cartAddSchema,
  cartItemParamsSchema,
  cartUpdateSchema,
  cartMergeSchema,
  checkoutSchema,
  checkoutQuoteSchema,
  orderStatusSchema,
  orderPaymentSchema,
  orderCancelSchema,
  orderNoteSchema,
  publicProductQuerySchema,
};
