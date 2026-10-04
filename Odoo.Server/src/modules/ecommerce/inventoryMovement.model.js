import mongoose from 'mongoose';

/**
 * Append-only stock ledger. One row per InventoryService.move() call so the
 * admin can always answer "why did this number change?".
 */
export const MOVEMENT_TYPES = Object.freeze([
  'stock_in',
  'sale',
  'adjustment',
  'return',
  'cancellation',
  'damage',
]);

const movementSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ArambhProduct',
      required: true,
    },
    variantId: { type: mongoose.Schema.Types.ObjectId, default: null },
    sku: { type: String, default: '' },
    productName: { type: String, default: '' },
    variantName: { type: String, default: '' },
    type: { type: String, enum: MOVEMENT_TYPES, required: true },
    /** Signed: negative removes from the shelf */
    quantity: { type: Number, required: true },
    quantityBefore: { type: Number, required: true },
    quantityAfter: { type: Number, required: true },
    referenceType: {
      type: String,
      enum: ['order', 'pos_order', 'purchase_order', 'manual', 'system'],
      default: 'manual',
    },
    referenceId: { type: String, default: '' },
    referenceLabel: { type: String, default: '' },
    reason: { type: String, default: '' },
    createdBy: { type: String, default: '' },
    createdByName: { type: String, default: '' },
    source: { type: String, default: 'admin' },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

movementSchema.index({ productId: 1, createdAt: -1 });
movementSchema.index({ variantId: 1, createdAt: -1 });
movementSchema.index({ referenceType: 1, referenceId: 1 });
movementSchema.index({ createdAt: -1 });

export const InventoryMovement =
  mongoose.models.ArambhInventoryMovement ||
  mongoose.model('ArambhInventoryMovement', movementSchema, 'inventory_movements');

export default InventoryMovement;
