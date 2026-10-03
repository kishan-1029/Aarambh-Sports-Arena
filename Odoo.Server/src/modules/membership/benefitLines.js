/**
 * Website benefit lines for a membership plan.
 * Built only from that plan's entitlements, plus optional display-only extras
 * such as "Locker" that are not a numeric rule.
 */

function addLine(lines, seen, line) {
  const text = String(line || '').trim();
  if (!text) return;
  const key = text.toLowerCase();
  if (seen.has(key)) return;
  seen.add(key);
  lines.push(text);
}

export function benefitLinesForPlan(entitlements, extraPerks = []) {
  const entitlementsSafe = entitlements || {};
  const court = entitlementsSafe.court || {};
  const lines = [];
  const seen = new Set();

  if (court.access === 'all') addLine(lines, seen, 'All courts');
  else if (court.access === 'off_peak_only') addLine(lines, seen, 'Off-peak courts');
  else if (court.access === 'none') addLine(lines, seen, 'No court access');

  const mode = court.pricing?.mode;
  const value = Number(court.pricing?.value) || 0;
  if (mode === 'free') addLine(lines, seen, 'Court time included');
  else if (mode === 'discount_pct' && value > 0) addLine(lines, seen, `${value}% off court time`);
  else if (mode === 'fixed_paise' && value > 0) {
    addLine(lines, seen, `Court time ₹${Math.round(value / 100)}`);
  }

  const perDay = Number(court.maxBookingsPerDay) || 0;
  if (perDay > 0) {
    addLine(lines, seen, `Up to ${perDay} booking${perDay === 1 ? '' : 's'} / day`);
  }

  const ahead = Number(court.advanceBookingDays) || 0;
  if (ahead > 0) addLine(lines, seen, `Book ${ahead} days ahead`);

  const shop = Number(entitlementsSafe.shopDiscountPct) || 0;
  if (shop > 0) addLine(lines, seen, `${shop}% shop discount`);

  const bar = Number(entitlementsSafe.barDiscountPct) || 0;
  if (bar > 0) addLine(lines, seen, `${bar}% bar discount`);

  const guests = Number(entitlementsSafe.guestPasses) || 0;
  if (guests > 0) addLine(lines, seen, `${guests} guest pass${guests === 1 ? '' : 'es'}`);

  for (const perk of extraPerks) addLine(lines, seen, perk);
  return lines;
}

/** Display-only extras that are not implied by the numeric entitlements. */
export const SEEDED_EXTRA_PERKS = {
  gold: ['Locker', 'Free towel'],
  junior: ['Junior coaching discount'],
};
