import mongoose from 'mongoose';

/**
 * Arambh role definitions (string permission sets).
 * Separate from legacy RoleMaster / EmployeeRoles menu CRUD.
 */
const arambhRoleSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    name: { type: String, required: true, trim: true },
    permissions: { type: [String], default: [] },
    isActive: { type: Boolean, default: true },
    isDemo: { type: Boolean, default: false },
  },
  { timestamps: true, collection: 'arambhRoles' },
);

arambhRoleSchema.index({ isDemo: 1 });

export const ArambhRole =
  mongoose.models.ArambhRole || mongoose.model('ArambhRole', arambhRoleSchema);

export default ArambhRole;
