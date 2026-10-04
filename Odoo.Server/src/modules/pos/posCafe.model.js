import mongoose from 'mongoose';

/**
 * Café / bar outlet (BFS StoreMaster pattern).
 * Multiple cafés share a global product master; each has its own menu config.
 */
const schema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    description: { type: String, default: '' },
    contactNumber: { type: String, default: '' },
    isAcceptingOrders: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
    sequence: { type: Number, default: 0 },
    isDemo: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const PosCafe =
  mongoose.models.PosCafe || mongoose.model('PosCafe', schema, 'posCafes');
