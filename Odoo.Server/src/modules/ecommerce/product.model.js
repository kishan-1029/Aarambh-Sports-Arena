import mongoose from 'mongoose';

/**
 * Variants are embedded so a single guarded `findOneAndUpdate` can decrement
 * stock atomically (same pattern booking uses for MemberDayCounter).
 * When a product has variants the variant stock is the authoritative one.
 */
const variantSchema = new mongoose.Schema(
  {
    sku: { type: String, required: true, trim: true, uppercase: true },
    name: { type: String, default: '' },
    size: { type: String, default: '' },
    colour: { type: String, default: '' },
    additionalPricePaise: { type: Number, default: 0 },
    stockQuantity: { type: Number, default: 0, min: 0 },
    lowStockThreshold: { type: Number, default: null },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const imageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    altText: { type: String, default: '' },
    sortOrder: { type: Number, default: 0 },
    isPrimary: { type: Boolean, default: false },
  },
  { timestamps: true },
);

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true },
    sku: { type: String, required: true, trim: true, uppercase: true },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ArambhProductCategory',
      required: true,
    },
    brand: { type: String, default: '' },
    shortDescription: { type: String, default: '' },
    description: { type: String, default: '' },

    sellingPricePaise: { type: Number, required: true, min: 0 },
    mrpPaise: { type: Number, default: 0, min: 0 },
    costPricePaise: { type: Number, default: 0, min: 0 },
    taxRatePct: { type: Number, default: 0, min: 0, max: 100 },

    trackInventory: { type: Boolean, default: true },
    stockQuantity: { type: Number, default: 0, min: 0 },
    lowStockThreshold: { type: Number, default: 5, min: 0 },

    hasVariants: { type: Boolean, default: false },
    variants: { type: [variantSchema], default: [] },
    images: { type: [imageSchema], default: [] },

    /** Drives the existing entitlements.shopDiscountPct(entitlements, product) helper */
    memberDiscountEligible: { type: Boolean, default: true },
    fulfillment: {
      pickup: { type: Boolean, default: true },
      delivery: { type: Boolean, default: true },
    },

    featured: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
    archivedAt: { type: Date, default: null },

    createdBy: { type: String, default: '' },
    updatedBy: { type: String, default: '' },
    isDemo: { type: Boolean, default: false },
  },
  { timestamps: true },
);

productSchema.index({ slug: 1 }, { unique: true });
productSchema.index({ sku: 1 }, { unique: true });
productSchema.index({ categoryId: 1, active: 1 });
productSchema.index({ active: 1, featured: -1, createdAt: -1 });
productSchema.index({ 'variants.sku': 1 }, { unique: true, sparse: true });

export const Product =
  mongoose.models.ArambhProduct ||
  mongoose.model('ArambhProduct', productSchema, 'products');

export default Product;
