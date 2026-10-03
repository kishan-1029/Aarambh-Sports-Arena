import { toZonedTime } from 'date-fns-tz';
import { formatInTimeZone } from 'date-fns-tz';
import { CLUB_TZ } from '../../lib/time.js';
import { applyCourtPricing } from '../membership/entitlements.js';
import { computeLine } from '../../lib/money.js';
import { Tax } from '../settings/tax.model.js';
import { Settings } from '../settings/settings.model.js';

/**
 * Peak = slot start inside any court.pricing.peakWindows for that weekday (club TZ).
 * @param {object} court
 * @param {Date} startUtc
 */
export function isPeak(court, startUtc) {
  const windows = court?.pricing?.peakWindows || [];
  if (!windows.length) return false;
  const zoned = toZonedTime(startUtc, CLUB_TZ);
  const dow = zoned.getDay();
  const hhmm = formatInTimeZone(startUtc, CLUB_TZ, 'HH:mm');
  return windows.some((w) => {
    const days = w.dow?.length ? w.dow : [0, 1, 2, 3, 4, 5, 6];
    if (!days.includes(dow)) return false;
    return hhmm >= w.from && hhmm < w.to;
  });
}

/**
 * @param {{
 *   court: object,
 *   startUtc: Date,
 *   entitlements?: object,
 *   type?: string,
 *   overridePaise?: number|null,
 * }} args
 */
export async function courtPrice({
  court,
  startUtc,
  entitlements,
  type = 'member',
  overridePaise = null,
}) {
  const peak = isPeak(court, startUtc);
  const band = peak ? 'peak' : 'offPeak';

  if (overridePaise != null) {
    const tax = await taxForCourt(court);
    const line = tax
      ? computeLine({ unitPricePaise: overridePaise, qty: 1, tax: [{ ratePct: tax.ratePct }] })
      : { totalPaise: overridePaise, taxPaise: 0 };
    return {
      basePaise: overridePaise,
      discountPaise: 0,
      taxPaise: line.taxPaise || 0,
      totalPaise: line.totalPaise ?? overridePaise,
      rule: 'admin_override',
      peak,
    };
  }

  if (type === 'trial') {
    const settings = await Settings.findOne({ locationId: null }).lean();
    const trialPaise = settings?.trialPricePaise ?? 0;
    return {
      basePaise: trialPaise,
      discountPaise: 0,
      taxPaise: 0,
      totalPaise: trialPaise,
      rule: 'trial',
      peak,
    };
  }

  const walkIn = court?.pricing?.walkInPaise?.[band] ?? 0;
  const memberBase = court?.pricing?.memberBasePaise?.[band] ?? walkIn;
  const isMember = Boolean(entitlements?.membershipId || entitlements?.planKey);

  if (!isMember) {
    const tax = await taxForCourt(court);
    const line = tax
      ? computeLine({ unitPricePaise: walkIn, qty: 1, tax: [{ ratePct: tax.ratePct }] })
      : { totalPaise: walkIn, taxPaise: 0 };
    return {
      basePaise: walkIn,
      discountPaise: 0,
      taxPaise: line.taxPaise || 0,
      totalPaise: line.totalPaise ?? walkIn,
      rule: peak ? 'walk_in_peak' : 'walk_in_off_peak',
      peak,
    };
  }

  const priced = applyCourtPricing({ entitlements, basePaise: memberBase });
  let rule = priced.rule;
  const planKey = entitlements.planKey || 'member';
  if (priced.rule === 'member_free') rule = `${planKey}_free`;
  else if (priced.rule.startsWith('discount_pct')) rule = `${planKey}_${priced.rule}_${band}`;
  else rule = `${planKey}_${priced.rule}_${band}`;

  const tax = await taxForCourt(court);
  const line = tax
    ? computeLine({ unitPricePaise: priced.pricePaise, qty: 1, tax: [{ ratePct: tax.ratePct }] })
    : { totalPaise: priced.pricePaise, taxPaise: 0 };

  return {
    basePaise: memberBase,
    discountPaise: Math.max(0, memberBase - priced.pricePaise),
    taxPaise: line.taxPaise || 0,
    totalPaise: line.totalPaise ?? priced.pricePaise,
    rule,
    peak,
  };
}

async function taxForCourt(court) {
  if (!court?.taxId) return null;
  return Tax.findById(court.taxId).lean();
}

export default { courtPrice, isPeak };
