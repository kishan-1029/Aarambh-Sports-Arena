/**
 * Single helper for applying membership entitlements (booking / shop / POS).
 * Non-member defaults return zero discounts and walk-in court pricing.
 */
import { Membership } from './membership.model.js';

export const NON_MEMBER_ENTITLEMENTS = Object.freeze({
  court: {
    access: 'all',
    pricing: { mode: 'fixed_paise', value: null },
    maxBookingsPerDay: 0,
    advanceBookingDays: 7,
    sportKeys: [],
  },
  shopDiscountPct: 0,
  barDiscountPct: 0,
  guestPasses: 0,
  perks: [],
});

/**
 * @param {{ entitlements: object, basePaise: number }} args
 * @returns {{ pricePaise: number, rule: string }}
 */
export function applyCourtPricing({ entitlements, basePaise }) {
  const base = Number(basePaise) || 0;
  const pricing = entitlements?.court?.pricing || { mode: 'fixed_paise', value: null };
  if (pricing.mode === 'free') {
    return { pricePaise: 0, rule: 'member_free' };
  }
  if (pricing.mode === 'discount_pct') {
    const pct = Math.max(0, Math.min(100, Number(pricing.value) || 0));
    const pricePaise = Math.round(base * (100 - pct) / 100);
    return { pricePaise, rule: `discount_pct_${pct}` };
  }
  if (pricing.mode === 'fixed_paise' && pricing.value != null) {
    return { pricePaise: Number(pricing.value), rule: 'fixed_paise' };
  }
  return { pricePaise: base, rule: 'walk_in' };
}

/**
 * @param {object} entitlements
 * @param {{ memberDiscountEligible?: boolean }} product
 */
export function shopDiscountPct(entitlements, product) {
  if (!product?.memberDiscountEligible) return 0;
  return Number(entitlements?.shopDiscountPct) || 0;
}

/**
 * @param {object} entitlements
 * @param {{ ageRestricted?: boolean }} product
 * @param {{ tierKey?: string }} [member]
 */
export function barDiscountPct(entitlements, product, member) {
  if (product?.ageRestricted && (member?.tierKey === 'junior' || entitlements?.barDiscountPct === 0)) {
    return 0;
  }
  return Number(entitlements?.barDiscountPct) || 0;
}

/**
 * @param {object} entitlements
 * @param {{ sportKey?: string }} court
 * @param {Date} [slotStart]
 * @returns {{ ok: boolean, code?: string }}
 */
export function canBookCourt(entitlements, court, slotStart) {
  const access = entitlements?.court?.access || 'none';
  if (access === 'none') return { ok: false, code: 'ENTITLEMENT_DENIED' };

  const sportKeys = entitlements?.court?.sportKeys || [];
  if (sportKeys.length && court?.sportKey && !sportKeys.includes(court.sportKey)) {
    return { ok: false, code: 'SPORT_NOT_ALLOWED' };
  }

  if (access === 'off_peak_only' && slotStart) {
    // Peak heuristic: weekday 17:00–22:00 IST handled by callers with local HH:mm;
    // stub treats missing peak flag as allowed for Phase 5.
    if (court?.isPeak === true) {
      return { ok: false, code: 'OFF_PEAK_ONLY' };
    }
  }

  return { ok: true };
}

/**
 * Active membership snapshot or non-member defaults.
 * @param {string} memberId
 * @param {Date} [atDate]
 */
export async function entitlementsFor(memberId, atDate = new Date()) {
  const membership = await Membership.findOne({
    memberId,
    status: { $in: ['active', 'scheduled'] },
    startDate: { $lte: atDate },
    endDate: { $gte: atDate },
  })
    .sort({ startDate: -1 })
    .lean();

  if (membership?.entitlementsSnapshot) {
    return {
      ...membership.entitlementsSnapshot,
      planKey: membership.planKey,
      membershipId: String(membership._id),
    };
  }
  return { ...NON_MEMBER_ENTITLEMENTS };
}

export default {
  NON_MEMBER_ENTITLEMENTS,
  applyCourtPricing,
  shopDiscountPct,
  barDiscountPct,
  canBookCourt,
  entitlementsFor,
};
