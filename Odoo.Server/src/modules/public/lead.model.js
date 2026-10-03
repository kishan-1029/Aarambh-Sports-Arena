import mongoose from 'mongoose';

/**
 * Minimal CRM lead for public website enquiries / trials (Phase 14 MVP).
 * Full pipeline UI lands in Phase 11.
 */
const leadSchema = new mongoose.Schema(
  {
    leadNo: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, default: '', trim: true, lowercase: true },
    phone: { type: String, required: true, trim: true },
    source: {
      type: String,
      enum: ['website_form', 'trial_booking', 'phone', 'walk_in', 'ai_chat', 'referral'],
      default: 'website_form',
    },
    interest: { type: [String], default: [] },
    message: { type: String, default: '', maxlength: 2000 },
    stage: {
      type: String,
      enum: ['new', 'contacted', 'trial_scheduled', 'trial_done', 'quoted', 'won', 'lost'],
      default: 'new',
    },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, default: null },
    nextActionAt: { type: Date, default: null },
    nextActionNote: { type: String, default: '' },
    lastContactAt: { type: Date, default: null },
    slaDueAt: { type: Date, default: null },
    lostReason: { type: String, default: '' },
    convertedMemberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ArambhMember',
      default: null,
    },
    trialBookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ArambhBooking',
      default: null,
    },
    /** When trial slot requested but booking engine could not confirm */
    trialRequest: {
      sportId: { type: mongoose.Schema.Types.ObjectId, ref: 'ArambhSport', default: null },
      courtId: { type: mongoose.Schema.Types.ObjectId, ref: 'ArambhCourt', default: null },
      startUtc: { type: Date, default: null },
      localDate: { type: String, default: '' },
      note: { type: String, default: '' },
    },
    companyName: { type: String, default: '' },
    isDemo: { type: Boolean, default: false },
  },
  { timestamps: true },
);

leadSchema.index({ leadNo: 1 }, { unique: true });
leadSchema.index({ stage: 1, assignedTo: 1 });
leadSchema.index({ slaDueAt: 1, stage: 1 });
leadSchema.index({ phone: 1 });
leadSchema.index({ email: 1 });
leadSchema.index({ createdAt: -1 });

export const Lead =
  mongoose.models.ArambhLead || mongoose.model('ArambhLead', leadSchema, 'leads');

export default Lead;
