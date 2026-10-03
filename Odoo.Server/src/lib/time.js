import { formatInTimeZone, fromZonedTime, toZonedTime } from 'date-fns-tz';
import { addMinutes, setSeconds, setMilliseconds, startOfWeek, endOfWeek } from 'date-fns';
import { now as clockNow } from './clock.js';
import { config } from '../config/index.js';

export const CLUB_TZ = config.clubTimezone || 'Asia/Kolkata';

/**
 * @param {Date} [date]
 * @returns {string} YYYY-MM-DD in club TZ
 */
export function toLocalDate(date = clockNow()) {
  return formatInTimeZone(date, CLUB_TZ, 'yyyy-MM-dd');
}

/**
 * Local date + HH:mm in club TZ → UTC Date.
 * @param {string} localDate YYYY-MM-DD
 * @param {string} hhmm HH:mm
 * @returns {Date}
 */
export function localDateTimeToUtc(localDate, hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  const pad = (n) => String(n).padStart(2, '0');
  const localIso = `${localDate}T${pad(h)}:${pad(m)}:00`;
  return fromZonedTime(localIso, CLUB_TZ);
}

/**
 * Align a UTC date down to slot minutes in club local time, return UTC.
 * @param {Date} date
 * @param {number} [slotMinutes=30]
 */
export function alignToSlot(date, slotMinutes = 30) {
  const minutesStr = formatInTimeZone(date, CLUB_TZ, 'HH:mm');
  const [hh, mm] = minutesStr.split(':').map(Number);
  const minutes = hh * 60 + mm;
  const aligned = Math.floor(minutes / slotMinutes) * slotMinutes;
  const h = Math.floor(aligned / 60);
  const m = aligned % 60;
  const localDate = toLocalDate(date);
  return localDateTimeToUtc(
    localDate,
    `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
  );
}

/**
 * UTC half-open range covering a local calendar day in club TZ: [start, end).
 * @param {string} localDate
 * @returns {{ startUtc: Date, endUtc: Date }}
 */
export function dayRange(localDate) {
  const startUtc = localDateTimeToUtc(localDate, '00:00');
  // noon + 24h avoids DST edge cases; IST has none but keep robust
  const noon = localDateTimeToUtc(localDate, '12:00');
  const nextNoon = new Date(noon.getTime() + 24 * 60 * 60 * 1000);
  const nextLocal = toLocalDate(nextNoon);
  const endUtc = localDateTimeToUtc(nextLocal, '00:00');
  return { startUtc, endUtc };
}

/**
 * Week range (Monday start) containing localDate.
 * @param {string} localDate
 */
export function weekRange(localDate) {
  const mid = localDateTimeToUtc(localDate, '12:00');
  const zoned = toZonedTime(mid, CLUB_TZ);
  const start = startOfWeek(zoned, { weekStartsOn: 1 });
  const end = endOfWeek(zoned, { weekStartsOn: 1 });
  const startLocal = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
  const endLocal = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;
  return {
    startUtc: dayRange(startLocal).startUtc,
    endUtc: dayRange(endLocal).endUtc,
  };
}

/**
 * @param {Date} date
 * @param {number} minutes
 */
export function addMinutesUtc(date, minutes) {
  return addMinutes(setMilliseconds(setSeconds(date, 0), 0), minutes);
}

export default {
  CLUB_TZ,
  toLocalDate,
  localDateTimeToUtc,
  alignToSlot,
  dayRange,
  weekRange,
  addMinutesUtc,
};
