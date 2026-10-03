/**
 * Aggregated KPIs for the admin dashboard (demo-friendly, real Mongo counts).
 */
import { Member } from '../members/member.model.js';
import { Membership } from '../membership/membership.model.js';
import { Booking } from '../booking/booking.model.js';
import { Invoice } from '../finance/invoice.model.js';
import { Payment } from '../finance/payment.model.js';
import { Customer } from '../customers/customer.model.js';
import { Court } from '../facilities/court.model.js';
import { Lead } from '../public/lead.model.js';
import { toLocalDate, localDateTimeToUtc } from '../../lib/time.js';

function startOfLocalDay(localDate = toLocalDate()) {
  return localDateTimeToUtc(localDate, '00:00');
}

function addDaysLocal(localDate, days) {
  const noon = localDateTimeToUtc(localDate, '12:00');
  return toLocalDate(new Date(noon.getTime() + days * 86400000));
}

function lastNLocalDates(n) {
  const out = [];
  let d = toLocalDate();
  for (let i = n - 1; i >= 0; i -= 1) {
    out.push(addDaysLocal(d, -i));
  }
  return out;
}

export async function getDashboardSummary() {
  const today = toLocalDate();
  const todayStart = startOfLocalDay(today);
  const tomorrowStart = startOfLocalDay(addDaysLocal(today, 1));
  const weekAhead = startOfLocalDay(addDaysLocal(today, 8));
  const monthStartLocal = `${today.slice(0, 8)}01`;
  const monthStart = startOfLocalDay(monthStartLocal);

  const [
    membersActive,
    membersTotal,
    membershipsActive,
    membershipsExpiring,
    bookingsToday,
    bookingsWeek,
    courtsActive,
    customersTotal,
    leadsOpen,
    revenueMonthAgg,
    collectionsMonthAgg,
    bookingsByStatus,
    revenueByDayRaw,
    bookingsBySport,
    recentBookings,
    expiringList,
  ] = await Promise.all([
    Member.countDocuments({ status: 'active', archivedAt: null }),
    Member.countDocuments({ archivedAt: null }),
    Membership.countDocuments({ status: 'active' }),
    Membership.countDocuments({
      status: 'active',
      endDate: { $gte: todayStart, $lte: weekAhead },
    }),
    Booking.countDocuments({
      localDate: today,
      status: { $nin: ['cancelled'] },
    }),
    Booking.countDocuments({
      localDate: { $gte: today, $lte: addDaysLocal(today, 6) },
      status: { $nin: ['cancelled'] },
    }),
    Court.countDocuments({ status: 'active' }),
    Customer.countDocuments({ archivedAt: null }),
    Lead.countDocuments({
      stage: { $in: ['new', 'contacted', 'trial_scheduled', 'quoted'] },
    }).catch(() => 0),
    Invoice.aggregate([
      {
        $match: {
          status: { $in: ['posted', 'partially_paid', 'paid'] },
          kind: { $ne: 'credit_note' },
          createdAt: { $gte: monthStart },
        },
      },
      { $group: { _id: null, total: { $sum: '$totals.totalPaise' } } },
    ]),
    Payment.aggregate([
      {
        $match: {
          status: 'captured',
          createdAt: { $gte: monthStart },
        },
      },
      { $group: { _id: null, total: { $sum: '$amountPaise' } } },
    ]),
    Booking.aggregate([
      { $match: { localDate: { $gte: addDaysLocal(today, -13), $lte: today } } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Booking.aggregate([
      {
        $match: {
          localDate: { $gte: addDaysLocal(today, -6), $lte: today },
          status: { $nin: ['cancelled'] },
        },
      },
      { $group: { _id: '$localDate', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    Booking.aggregate([
      {
        $match: {
          localDate: { $gte: addDaysLocal(today, -29), $lte: today },
          status: { $nin: ['cancelled'] },
        },
      },
      {
        $lookup: {
          from: 'courts',
          localField: 'courtId',
          foreignField: '_id',
          as: 'court',
        },
      },
      { $unwind: { path: '$court', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'sports',
          localField: 'court.sportId',
          foreignField: '_id',
          as: 'sport',
        },
      },
      { $unwind: { path: '$sport', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: { $ifNull: ['$sport.name', 'Other'] },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 6 },
    ]),
    Booking.find({ localDate: { $gte: today } })
      .sort({ start: 1 })
      .limit(8)
      .populate({ path: 'courtId', select: 'code name' })
      .populate({ path: 'bookedByMemberId', select: 'firstName lastName memberCode' })
      .lean(),
    Membership.find({
      status: 'active',
      endDate: { $gte: todayStart, $lte: weekAhead },
    })
      .sort({ endDate: 1 })
      .limit(8)
      .populate({ path: 'memberId', select: 'firstName lastName memberCode tierKey' })
      .lean(),
  ]);

  const days = lastNLocalDates(7);
  const byDayMap = Object.fromEntries((revenueByDayRaw || []).map((r) => [r._id, r.count]));
  const bookingsTrend = days.map((d) => ({
    date: d,
    label: d.slice(5),
    bookings: byDayMap[d] || 0,
  }));

  const statusMap = Object.fromEntries((bookingsByStatus || []).map((r) => [r._id, r.count]));

  return {
    period: { today, monthStart: monthStartLocal },
    kpis: {
      revenueMonthPaise: revenueMonthAgg[0]?.total || 0,
      collectionsMonthPaise: collectionsMonthAgg[0]?.total || 0,
      membersActive,
      membersTotal,
      membershipsActive,
      membershipsExpiringSoon: membershipsExpiring,
      bookingsToday,
      bookingsWeek,
      courtsActive,
      customersTotal,
      leadsOpen: leadsOpen || 0,
      occupancyHintPct:
        courtsActive > 0
          ? Math.min(100, Math.round((bookingsToday / (courtsActive * 8)) * 100))
          : 0,
    },
    charts: {
      bookingsTrend,
      bookingsByStatus: Object.entries(statusMap).map(([status, count]) => ({
        status,
        count,
      })),
      bookingsBySport: (bookingsBySport || []).map((r) => ({
        sport: r._id,
        count: r.count,
      })),
    },
    lists: {
      upcomingBookings: (recentBookings || []).map((b) => ({
        id: String(b._id),
        bookingNo: b.bookingNo,
        localDate: b.localDate,
        status: b.status,
        court: b.courtId?.code || b.courtId?.name || '—',
        member: b.bookedByMemberId
          ? `${b.bookedByMemberId.firstName || ''} ${b.bookedByMemberId.lastName || ''}`.trim()
          : b.customer?.name || 'Walk-in',
      })),
      expiringMemberships: (expiringList || []).map((m) => ({
        id: String(m._id),
        planKey: m.planKey,
        endLocalDate: m.endLocalDate || (m.endDate ? String(m.endDate).slice(0, 10) : null),
        member: m.memberId
          ? {
              id: String(m.memberId._id),
              name: `${m.memberId.firstName || ''} ${m.memberId.lastName || ''}`.trim(),
              code: m.memberId.memberCode,
              tierKey: m.memberId.tierKey,
            }
          : null,
      })),
    },
  };
}

export default { getDashboardSummary };
