import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PortalAccount } from './portalAccount.model.js';
import { Member } from '../members/member.model.js';
import { Customer } from '../customers/customer.model.js';
import { Court } from '../facilities/court.model.js';
import { Sport } from '../facilities/sport.model.js';
import { Booking } from '../booking/booking.model.js';
import { Membership } from '../membership/membership.model.js';
import * as bookingService from '../booking/booking.service.js';
import * as pricingService from '../booking/pricing.service.js';
import * as membershipService from '../membership/membership.service.js';
import { entitlementsFor } from '../membership/entitlements.js';
import { nextNumber } from '../../lib/counters.js';
import { withTransaction } from '../../lib/db.js';
import { Conflict, NotFound, Validation, Unauthorized } from '../../lib/errors.js';

const JWT_SECRET =
  process.env.PORTAL_JWT_SECRET ||
  process.env.ADMIN_JWT_SECRET_KEY ||
  'arambh_portal_jwt_secret_key_2026';

function signToken(accountId) {
  return jwt.sign({ id: String(accountId), role: 'PORTAL_USER' }, JWT_SECRET, {
    expiresIn: '7d',
  });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

function normalizePhone(phone) {
  return String(phone || '').replace(/\D/g, '').slice(-10);
}

function formatUser(account, member) {
  return {
    id: String(account._id),
    name: account.name,
    email: account.email,
    phone: account.phone,
    dob: account.dob ? account.dob.toISOString().slice(0, 10) : null,
    memberId: member ? String(member._id) : null,
    memberCode: member?.memberCode || null,
    tierKey: member?.tierKey || 'none',
    status: member?.status || 'active',
    membershipEndDate: member?.membershipEndDate || null,
  };
}

export async function register({ name, email, phone, dob, password }) {
  const cleanName = String(name || '').trim();
  const cleanEmail = String(email || '').trim().toLowerCase();
  const cleanPhone = normalizePhone(phone);

  if (!cleanName) throw Validation([{ path: 'name', message: 'Name is required' }]);
  if (!cleanEmail) throw Validation([{ path: 'email', message: 'Email is required' }]);
  if (!cleanPhone || cleanPhone.length !== 10) {
    throw Validation([{ path: 'phone', message: 'Valid 10-digit phone number is required' }]);
  }
  if (!dob) throw Validation([{ path: 'dob', message: 'Date of birth is required' }]);
  if (!password || password.length < 8) {
    throw Validation([{ path: 'password', message: 'Password must be at least 8 characters' }]);
  }

  const existingAccount = await PortalAccount.findOne({
    $or: [{ email: cleanEmail }, { phone: cleanPhone }],
  });
  if (existingAccount) {
    throw Conflict('ACCOUNT_EXISTS', 'An account with this email or phone already exists');
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const dobDate = new Date(dob);

  const [firstName, ...rest] = cleanName.split(' ');
  const lastName = rest.join(' ');

  let customer = await Customer.findOne({
    archivedAt: null,
    $or: [{ phone: new RegExp(`${cleanPhone}$`) }, { email: cleanEmail }],
  });

  let member = await Member.findOne({
    archivedAt: null,
    $or: [{ phone: new RegExp(`${cleanPhone}$`) }, { email: cleanEmail }],
  });

  const year = new Date().getFullYear();

  const account = await withTransaction(async (session) => {
    if (!customer) {
      const [c] = await Customer.create(
        [
          {
            type: 'person',
            name: cleanName,
            email: cleanEmail,
            phone: cleanPhone,
            tags: ['member', 'portal'],
          },
        ],
        { session }
      );
      customer = c;
    }

    if (!member) {
      const code = await nextNumber(`member:${year}`, `MBR/${year}/{SEQ:5}`, { session });
      const [m] = await Member.create(
        [
          {
            memberCode: code,
            customerId: customer._id,
            firstName: firstName || cleanName,
            lastName: lastName || '',
            dob: dobDate,
            phone: cleanPhone,
            email: cleanEmail,
            tierKey: 'none',
            status: 'active',
            source: 'website',
          },
        ],
        { session }
      );
      member = m;
    }

    const [acc] = await PortalAccount.create(
      [
        {
          name: cleanName,
          email: cleanEmail,
          phone: cleanPhone,
          dob: dobDate,
          passwordHash,
          customerId: customer._id,
          memberId: member._id,
          lastLoginAt: new Date(),
        },
      ],
      { session }
    );

    return acc;
  });

  const token = signToken(account._id);
  return {
    token,
    user: formatUser(account, member),
  };
}

export async function login({ email, password }) {
  const cleanInput = String(email || '').trim().toLowerCase();
  const phoneDigits = normalizePhone(cleanInput);

  if (!cleanInput) throw Validation([{ path: 'email', message: 'Email or phone required' }]);
  if (!password) throw Validation([{ path: 'password', message: 'Password required' }]);

  const or = [{ email: cleanInput }];
  if (phoneDigits.length === 10) {
    or.push({ phone: phoneDigits });
  }

  const account = await PortalAccount.findOne({ $or: or });
  if (!account) {
    throw Unauthorized('Invalid email/phone or password');
  }

  const ok = await bcrypt.compare(password, account.passwordHash);
  if (!ok) {
    throw Unauthorized('Invalid email/phone or password');
  }

  account.lastLoginAt = new Date();
  await account.save();

  const member = account.memberId ? await Member.findById(account.memberId).lean() : null;
  const token = signToken(account._id);

  return {
    token,
    user: formatUser(account, member),
  };
}

export async function getMe(accountId) {
  const account = await PortalAccount.findById(accountId);
  if (!account || !account.isActive) throw Unauthorized('Account not found or inactive');
  const member = account.memberId ? await Member.findById(account.memberId).lean() : null;
  return formatUser(account, member);
}

export async function quoteSlot({ accountId, courtId, startUtc }) {
  const court = await Court.findById(courtId).lean();
  if (!court || court.status !== 'active') throw NotFound('Court');

  let entitlements = null;
  const account = await PortalAccount.findById(accountId).lean();
  if (account?.memberId) {
    const member = await Member.findById(account.memberId).lean();
    if (member) {
      entitlements = await entitlementsFor(member);
    }
  }

  const quote = await pricingService.courtPrice({
    court,
    startUtc: new Date(startUtc),
    entitlements,
    type: 'member',
  });

  return quote;
}

export async function bookSlot({ accountId, courtId, startUtc, paymentMethod = 'upi' }) {
  const account = await PortalAccount.findById(accountId);
  if (!account) throw Unauthorized('Account required to book');

  const member = account.memberId ? await Member.findById(account.memberId) : null;
  const customerId = account.customerId || member?.customerId;

  const ctx = {
    user: { id: String(account._id), name: account.name, email: account.email },
    source: 'website',
  };

  const booking = await bookingService.create(
    {
      courtId,
      startUtc: new Date(startUtc),
      bookedByMemberId: member?._id,
      memberId: member?._id,
      customerId,
      channel: 'website',
      payment: {
        method: paymentMethod,
      },
    },
    ctx
  );

  return booking;
}

export async function listMyBookings(accountId) {
  const account = await PortalAccount.findById(accountId);
  if (!account) return [];

  const memberId = account.memberId;
  const customerId = account.customerId;

  const or = [];
  if (memberId) or.push({ bookedByMemberId: memberId }, { 'participants.memberId': memberId });
  if (customerId) or.push({ customerId });

  if (!or.length) return [];

  const bookings = await Booking.find({ $or: or })
    .sort({ start: -1 })
    .populate('courtId', 'name sportId')
    .populate('sportId', 'name')
    .lean();

  return bookings.map((b) => ({
    id: String(b._id),
    _id: String(b._id),
    bookingNo: b.bookingNo,
    sportName: b.sportId?.name || 'Court Sport',
    courtName: b.courtId?.name || 'Court',
    startUtc: b.start,
    endUtc: b.end,
    localDate: b.localDate,
    status: b.status,
    totalPaise: b.price?.totalPaise ?? 0,
    pricePaise: b.price?.totalPaise ?? 0,
    cancellationReason: b.cancellation?.reason || '',
    refundPaise: b.cancellation?.refundPaise ?? null,
  }));
}

export async function cancelBooking({ accountId, bookingId, reason }) {
  const account = await PortalAccount.findById(accountId);
  if (!account) throw Unauthorized('Account required');

  const booking = await Booking.findById(bookingId).lean();
  if (!booking) throw NotFound('Booking');

  const isOwner =
    (account.memberId && String(booking.bookedByMemberId) === String(account.memberId)) ||
    (account.customerId && String(booking.customerId) === String(account.customerId));

  if (!isOwner) {
    throw Unauthorized('You do not have permission to cancel this booking');
  }

  const ctx = {
    user: { id: String(account._id), name: account.name, email: account.email },
    source: 'website',
  };

  const updated = await bookingService.cancel(bookingId, { reason }, ctx);
  return updated;
}

export async function buyMembership({ accountId, planId, durationMonths = 1, paymentMethod = 'upi' }) {
  const account = await PortalAccount.findById(accountId);
  if (!account || !account.memberId) throw Unauthorized('Member account required');

  const ctx = {
    user: { id: String(account._id), name: account.name, email: account.email },
    source: 'website',
  };

  const membership = await membershipService.purchase(
    {
      memberId: account.memberId,
      planId,
      months: Number(durationMonths) || 1,
      payment: {
        method: paymentMethod,
      },
    },
    ctx
  );

  return membership;
}
