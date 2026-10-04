import nodemailer from 'nodemailer';
import { formatInTimeZone } from 'date-fns-tz';
import EmailFor from '../../../models/EmailFor.js';
import EmailSetup from '../../../models/EmailSetup.js';
import EmailTemplate from '../../../models/EmailTemplate.js';
import { Customer } from '../customers/customer.model.js';
import { Member } from '../members/member.model.js';
import { Court } from '../facilities/court.model.js';
import { Sport } from '../facilities/sport.model.js';
import { logger } from '../../lib/logger.js';
import { config } from '../../config/index.js';
import { CLUB_TZ } from '../../lib/time.js';

export const BOOKING_PURPOSE = 'Court Booking';
export const MEMBERSHIP_PURPOSE = 'Membership';

const BOOKING_MARKER = 'data-arambh-mail="booking" data-arambh-slots="1"';
const MEMBERSHIP_MARKER = 'data-arambh-mail="membership"';

export function fillTemplate(template, data = {}) {
  return String(template || '').replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key) => {
    const val = data[key];
    return val == null ? '' : String(val);
  });
}

export function formatRupees(paise) {
  const rupees = Number(paise || 0) / 100;
  const text = Number.isInteger(rupees) ? String(rupees) : rupees.toFixed(2);
  return `₹${text}`;
}

export function formatWhen(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function asDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Clock time in the club timezone, for example 9:00 am. */
export function formatClock(value) {
  const date = asDate(value);
  if (!date) return '';
  return formatInTimeZone(date, CLUB_TZ, 'h:mm a').replace('AM', 'am').replace('PM', 'pm');
}

/** Calendar date in the club timezone, for example Sun, 4 Oct 2026. */
export function formatSlotDate(value) {
  const date = asDate(value);
  if (!date) return '';
  return formatInTimeZone(date, CLUB_TZ, 'EEE, d MMM yyyy');
}

export function formatTimeRange(start, end) {
  const from = formatClock(start);
  const to = formatClock(end);
  if (from && to) return `${from} – ${to}`;
  return from || to;
}

/**
 * Each stored slot start, closed by the next slot or the booking end.
 * One line per slot, for example "9:00 am – 9:30 am".
 */
export function formatBookedSlots(booking) {
  const start = asDate(booking?.start);
  const end = asDate(booking?.end);
  const starts = (booking?.slotStarts || [])
    .map(asDate)
    .filter(Boolean)
    .sort((a, b) => a.getTime() - b.getTime());

  if (starts.length < 2 || !end) return formatTimeRange(start, end);

  return starts
    .map((slotStart, index) => {
      const slotEnd = index < starts.length - 1 ? starts[index + 1] : end;
      return formatTimeRange(slotStart, slotEnd);
    })
    .join('<br>');
}

function shell({ marker, title, intro, rows }) {
  const lines = rows
    .map(
      ([label, token]) =>
        `<tr><td style="padding:10px 0;color:#5c6b63;font-size:14px;">${label}</td><td style="padding:10px 0;text-align:right;font-weight:700;color:#07140e;font-size:14px;">${token}</td></tr>`,
    )
    .join('');
  return `<!DOCTYPE html><html><body style="margin:0;background:#eef5f0;font-family:Segoe UI,sans-serif;">
  <div ${marker} style="max-width:560px;margin:24px auto;background:#ffffff;border-radius:16px;overflow:hidden;">
    <div style="background:#0c3d28;color:#ffffff;padding:28px 32px;">
      <div style="letter-spacing:.16em;font-size:12px;color:#b6f25c;font-weight:700;">AARAMBH SPORTS ARENA</div>
      <h1 style="margin:8px 0 0;font-size:26px;line-height:1.2;">${title}</h1>
    </div>
    <div style="padding:28px 32px;color:#07140e;font-size:16px;line-height:1.5;">
      <p style="margin:0 0 16px;">Hi {{name}},</p>
      <p style="margin:0 0 20px;">${intro}</p>
      <table style="width:100%;border-collapse:collapse;border-top:1px solid #e3eee7;">${lines}</table>
      <p style="margin:24px 0 0;color:#5c6b63;font-size:14px;">See you on court.<br/>Aarambh Sports Arena, Vadodara</p>
    </div>
  </div>
</body></html>`;
}

const BOOKING_HTML = shell({
  marker: BOOKING_MARKER,
  title: 'Your court is booked',
  intro: 'This confirms the court time you booked. Times below are India time (IST).',
  rows: [
    ['Booking', '{{bookingNo}}'],
    ['Status', '{{status}}'],
    ['Sport', '{{sport}}'],
    ['Court', '{{court}}'],
    ['Date', '{{date}}'],
    ['Time', '{{time}}'],
    ['Slots', '{{slots}}'],
    ['Amount', '{{amount}}'],
  ],
});

const MEMBERSHIP_HTML = shell({
  marker: MEMBERSHIP_MARKER,
  title: 'Your membership is active',
  intro: 'Welcome in. Your plan is on your profile and applies the next time you book a court.',
  rows: [
    ['Plan', '{{plan}}'],
    ['Status', '{{status}}'],
    ['Term', '{{months}} months'],
    ['Starts', '{{startDate}}'],
    ['Ends', '{{endDate}}'],
    ['Amount', '{{amount}}'],
  ],
});

async function activeSetup() {
  return EmailSetup.findOne({ isActive: true }).sort({ updatedAt: -1 });
}

async function ensurePurpose(emailFor) {
  return EmailFor.findOneAndUpdate(
    { emailFor },
    { $setOnInsert: { emailFor, isActive: true } },
    { upsert: true, new: true },
  );
}

async function ensureTemplate({ purpose, templateName, emailSubject, html, marker }) {
  const setup = await activeSetup();
  if (!setup) {
    logger.warn({ purpose }, 'no active Email Setup, transactional template not created');
    return null;
  }
  const emailFor = await ensurePurpose(purpose);
  const existing = await EmailTemplate.findOne({ emailFor: emailFor._id, isActive: true });
  if (existing?.emailSignature?.includes(marker)) return existing;

  const fields = {
    templateName,
    emailFrom: setup._id,
    emailFor: emailFor._id,
    mailerName: 'Aarambh Sports Arena',
    emailSubject,
    emailSignature: html,
    isActive: true,
    isAdmin: false,
  };

  if (existing) {
    existing.emailSubject = emailSubject;
    existing.emailSignature = html;
    existing.mailerName = fields.mailerName;
    if (!existing.emailFrom) existing.emailFrom = setup._id;
    await existing.save();
    return existing;
  }

  return EmailTemplate.create(fields);
}

export async function ensureTransactionalTemplates() {
  const booking = await ensureTemplate({
    purpose: BOOKING_PURPOSE,
    templateName: 'Court booking confirmation',
    emailSubject: 'Booking {{bookingNo}} at Aarambh Sports Arena',
    html: BOOKING_HTML,
    marker: BOOKING_MARKER,
  });
  const membership = await ensureTemplate({
    purpose: MEMBERSHIP_PURPOSE,
    templateName: 'Membership confirmation',
    emailSubject: 'Your {{plan}} membership at Aarambh',
    html: MEMBERSHIP_HTML,
    marker: MEMBERSHIP_MARKER,
  });
  return { booking: Boolean(booking), membership: Boolean(membership) };
}

function transportFor(setup) {
  const port = Number(setup.port) || 587;
  const secure = port === 465;
  return nodemailer.createTransport({
    host: setup.host,
    port,
    secure,
    auth: {
      user: setup.email,
      pass: setup.appPassword,
    },
  });
}

/**
 * Send the active CMS template for a purpose. Never throws to the caller.
 */
export async function sendPurposeEmail(purpose, { to, data }) {
  const recipient = String(to || '').trim();
  if (!recipient) return { sent: false, reason: 'no-recipient' };

  const emailFor = await EmailFor.findOne({ emailFor: purpose, isActive: true });
  if (!emailFor) return { sent: false, reason: 'no-purpose' };

  const template = await EmailTemplate.findOne({ emailFor: emailFor._id, isActive: true }).populate('emailFrom');
  const setup = template?.emailFrom;
  if (!template || !setup?.email || !setup?.host || !setup?.appPassword) {
    return { sent: false, reason: 'no-template' };
  }

  const subject = fillTemplate(template.emailSubject, data);
  const html = fillTemplate(template.emailSignature, data);
  const from = `"${template.mailerName || config.appName}" <${setup.email}>`;

  await transportFor(setup).sendMail({
    from,
    to: recipient,
    cc: template.emailCC || undefined,
    bcc: template.emailBCC || undefined,
    subject,
    html,
  });

  logger.info({ purpose, to: recipient, subject }, 'transactional email sent');
  return { sent: true };
}

export async function verifyMailSetup() {
  const setup = await activeSetup();
  if (!setup?.host || !setup?.email || !setup?.appPassword) {
    return { ok: false, reason: 'no-active-email-setup' };
  }
  try {
    await transportFor(setup).verify();
    return { ok: true, host: setup.host, port: Number(setup.port) || 587, from: setup.email };
  } catch (err) {
    return { ok: false, reason: err?.message || 'verify-failed', host: setup.host };
  }
}

async function safeSend(purpose, payload) {
  try {
    return await sendPurposeEmail(purpose, payload);
  } catch (err) {
    logger.warn({ err: err?.message, purpose }, 'transactional email failed');
    return { sent: false, reason: err?.message || 'send-failed' };
  }
}

export async function emailForBooking({ booking, court, sport, member, ctx, customerEmail }) {
  if (!booking || booking.isDemo) return { sent: false, reason: 'demo' };
  const to =
    member?.email ||
    ctx?.user?.email ||
    customerEmail ||
    booking.customer?.email ||
    '';
  const name =
    [member?.firstName, member?.lastName].filter(Boolean).join(' ') ||
    ctx?.user?.name ||
    booking.customer?.name ||
    'there';

  return safeSend(BOOKING_PURPOSE, {
    to,
    data: {
      name,
      bookingNo: booking.bookingNo || '',
      status: booking.status || '',
      sport: sport?.name || '',
      court: court?.name || court?.code || '',
      date: formatSlotDate(booking.start),
      time: formatTimeRange(booking.start, booking.end),
      slots: formatBookedSlots(booking),
      when: `${formatSlotDate(booking.start)}, ${formatTimeRange(booking.start, booking.end)}`,
      amount: formatRupees(booking.price?.totalPaise),
    },
  });
}

export async function emailForMembership({ membership, member, plan, amountPaise, ctx }) {
  if (!membership || membership.isDemo || member?.isDemo) return { sent: false, reason: 'demo' };
  const to = member?.email || ctx?.user?.email || '';
  const name =
    [member?.firstName, member?.lastName].filter(Boolean).join(' ') ||
    ctx?.user?.name ||
    'there';

  return safeSend(MEMBERSHIP_PURPOSE, {
    to,
    data: {
      name,
      plan: plan?.name || membership.planKey || 'Membership',
      status: membership.status || '',
      months: membership.durationMonths || '',
      startDate: membership.startLocalDate || '',
      endDate: membership.endLocalDate || '',
      amount: formatRupees(amountPaise),
    },
  });
}

export async function notifyBookingRecord(booking, ctx = {}) {
  if (!booking?._id || booking.isDemo) return { sent: false, reason: 'skip' };
  const [court, sport, member, customer] = await Promise.all([
    booking.courtId ? Court.findById(booking.courtId).select('name code').lean() : null,
    booking.sportId ? Sport.findById(booking.sportId).select('name').lean() : null,
    booking.bookedByMemberId ? Member.findById(booking.bookedByMemberId).select('firstName lastName email').lean() : null,
    booking.customer?.customerId
      ? Customer.findById(booking.customer.customerId).select('email name').lean()
      : null,
  ]);
  return emailForBooking({
    booking,
    court,
    sport,
    member,
    ctx,
    customerEmail: customer?.email,
  });
}
