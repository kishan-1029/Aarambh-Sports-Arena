import mongoose from 'mongoose';

/**
 * Only identifiers and quantities are persisted. Every price shown to the
 * customer is recomputed from the catalogue on read, never trusted from the client.
 */
const cartItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ArambhProduct',
      required: true,
    },
    variantId: { type: mongoose.Schema.Types.ObjectId, default: null },
    quantity: { type: Number, required: true, min: 1 },
  },
  { timestamps: true },
);

const cartSchema = new mongoose.Schema(
  {
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ArambhPortalAccount',
      required: true,
    },
    items: { type: [cartItemSchema], default: [] },
  },
  { timestamps: true },
);

cartSchema.index({ accountId: 1 }, { unique: true });

export const Cart =
  mongoose.models.ArambhCart || mongoose.model('ArambhCart', cartSchema, 'carts');

export default Cart;
