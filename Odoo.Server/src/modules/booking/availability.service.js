import { toZonedTime } from 'date-fns-tz';
import { Court } from '../facilities/court.model.js';
import { Sport } from '../facilities/sport.model.js';
import { Location } from '../settings/location.model.js';
import { Settings } from '../settings/settings.model.js';
import { SlotLock } from './slotLock.model.js';
import { MemberDayCounter } from './memberDayCounter.model.js';
import { courtPrice, isPeak } from './pricing.service.js';
import { canBookCourt, entitlementsFor } from '../membership/entitlements.js';
import {
  dayRange,
  localDateTimeToUtc,
  addMinutesUtc,
  toLocalDate,
  CLUB_TZ,
} from '../../lib/time.js';
import { now as clockNow } from '../../lib/clock.js';

/**
 * Operating window for a court on a local date (court hours ?? location hours).
 * @returns {{ open: string, close: string }|null}
 */
export function operatingWindow(court, location, localDate) {
  const noon = localDateTimeToUtc(localDate, '12:00');
  const dow = toZonedTime(noon, CLUB_TZ).getDay();
  const hours = court.operatingHours?.length
    ? court.operatingHours
    : location?.openingHours || [];
  const row = hours.find((h) => h.dow === dow);
  if (!row) return null;
  return { open: row.open, close: row.close };
}

/**
 * Slot units occupied by a session starting at startUtc.
 */
export function sessionUnits(startUtc, sessionMinutes = 60, slotStep = 30) {
  const units = [];
  for (let m = 0; m < sessionMinutes; m += slotStep) {
    units.push(addMinutesUtc(startUtc, m));
  }
  return units;
}

function lockStatus(lock, now) {
  if (!lock) return null;
  if (lock.kind === 'hold' && lock.expiresAt && lock.expiresAt < now) return null;
  if (lock.kind === 'hold') return 'held';
  if (lock.kind === 'block') return 'blocked';
  if (lock.kind === 'social') return 'social';
  return 'booked';
}

/**
 * @param {{
 *   sportId?: string,
 *   courtIds?: string[],
 *   localDate: string,
 *   forMember?: string|null,
 *   publicOnly?: boolean,
 * }} args
 */
export async function getAvailability({
  sportId,
  courtIds,
  localDate,
  forMember = null,
  publicOnly = false,
}) {
  const filter = { status: 'active' };
  if (sportId) filter.sportId = sportId;
  if (courtIds?.length) filter._id = { $in: courtIds };

  const courts = await Court.find(filter).lean();
  const sportIds = [...new Set(courts.map((c) => String(c.sportId)))];
  const sports = await Sport.find({ _id: { $in: sportIds } }).lean();
  const sportById = Object.fromEntries(sports.map((s) => [String(s._id), s]));

  const locationIds = [...new Set(courts.map((c) => c.locationId).filter(Boolean).map(String))];
  const locations = locationIds.length
    ? await Location.find({ _id: { $in: locationIds } }).lean()
    : await Location.find({ code: 'MAIN' }).lean();
  const locById = Object.fromEntries(locations.map((l) => [String(l._id), l]));
  const defaultLoc = locations[0] || null;

  const settings = await Settings.findOne({ locationId: null }).lean();
  const minLead = settings?.minLeadMinutes ?? 30;
  const now = clockNow();
  const minStart = addMinutesUtc(now, minLead);

  const { startUtc: dayStart, endUtc: dayEnd } = dayRange(localDate);
  const courtIdList = courts.map((c) => c._id);
  const locks = courtIdList.length
    ? await SlotLock.find({
        courtId: { $in: courtIdList },
        slotStart: { $gte: dayStart, $lt: dayEnd },
      }).lean()
    : [];

  const locksByCourt = new Map();
  for (const lock of locks) {
    const key = String(lock.courtId);
    if (!locksByCourt.has(key)) locksByCourt.set(key, new Map());
    locksByCourt.get(key).set(lock.slotStart.getTime(), lock);
  }

  let entitlements = null;
  let remaining = null;
  if (forMember) {
    entitlements = await entitlementsFor(forMember, now);
    const maxPerDay = entitlements?.court?.maxBookingsPerDay ?? 2;
    const counter = await MemberDayCounter.findOne({
      memberId: forMember,
      localDate,
    }).lean();
    remaining = Math.max(0, maxPerDay - (counter?.count || 0));
  }

  const resultCourts = [];
  for (const court of courts) {
    const sport = sportById[String(court.sportId)];
    if (!sport?.active) continue;
    const sessionMinutes = sport.sessionMinutes || 60;
    const slotStep = sport.slotStepMinutes || 30;
    const loc = court.locationId ? locById[String(court.locationId)] : defaultLoc;
    const window = operatingWindow(court, loc, localDate);
    if (!window) {
      resultCourts.push({
        courtId: String(court._id),
        name: publicOnly ? undefined : court.name,
        code: court.code,
        sportId: String(court.sportId),
        slots: [],
      });
      continue;
    }

    const openUtc = localDateTimeToUtc(localDate, window.open);
    const closeUtc = localDateTimeToUtc(localDate, window.close);
    const courtLocks = locksByCourt.get(String(court._id)) || new Map();
    const slots = [];

    for (
      let start = openUtc;
      addMinutesUtc(start, sessionMinutes) <= closeUtc;
      start = addMinutesUtc(start, slotStep)
    ) {
      const end = addMinutesUtc(start, sessionMinutes);
      const units = sessionUnits(start, sessionMinutes, slotStep);
      let status = 'available';
      if (start <= minStart) status = 'past';
      else {
        for (const u of units) {
          const lock = courtLocks.get(u.getTime());
          const s = lockStatus(lock, now);
          if (s) {
            status = s;
            break;
          }
        }
      }

      const slot = { start, end, status };
      if (!publicOnly && forMember && status === 'available') {
        const peak = isPeak(court, start);
        const check = canBookCourt(
          entitlements,
          { sportKey: sport.key, isPeak: peak },
          start,
        );
        const price = await courtPrice({ court, startUtc: start, entitlements });
        slot.pricePaise = price.totalPaise;
        slot.rule = price.rule;
        slot.allowed = check.ok && (remaining == null || remaining > 0);
        if (!check.ok) slot.reason = check.code;
        else if (remaining === 0) slot.reason = 'DAILY_LIMIT_REACHED';
        slot.remainingToday = remaining;
      } else if (!publicOnly && status === 'available') {
        const price = await courtPrice({ court, startUtc: start, entitlements: null, type: 'walk_in' });
        slot.pricePaise = price.totalPaise;
        slot.rule = price.rule;
      }
      slots.push(slot);
    }

    resultCourts.push({
      courtId: String(court._id),
      name: publicOnly ? undefined : court.name,
      code: court.code,
      sportId: String(court.sportId),
      sportKey: sport.key,
      slots,
    });
  }

  return { localDate, courts: resultCourts };
}

export default { getAvailability, operatingWindow, sessionUnits };
