import mongoose from 'mongoose';

/**
 * Per-café menu overlay (BFS StoreItemConfig pattern).
 * Admin decides which master products appear on each café POS.
 * Missing doc OR onMenu=false → not sold at that café.
 */
const schema = new mongoose.Schema(
  {
    cafeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PosCafe',
      required: true,
      index: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PosProduct',
      required: true,
      index: true,
    },
    onMenu: { type: Boolean, default: true },
    isSoldOut: { type: Boolean, default: false },
    /** null / undefined → use product.pricePaise */
    customPricePaise: { type: Number, default: null, min: 0 },
    displayOrder: { type: Number, default: 0 },
    isDemo: { type: Boolean, default: false },
  },
  { timestamps: true },
);

schema.index({ cafeId: 1, productId: 1 }, { unique: true });

export const PosCafeMenu =
  mongoose.models.PosCafeMenu || mongoose.model('PosCafeMenu', schema, 'posCafeMenus');
