import mongoose from "mongoose";

const CountrySchema = new mongoose.Schema(
  {
    countryName: {
      type: String,
      required: true,
      unique: true,
    },
    countryCode: {
      type: String,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      required: true,
    },
  },
  { timestamps: true },
);

export default mongoose.model("Country", CountrySchema);
