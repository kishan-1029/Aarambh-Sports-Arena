import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, formatCalendarDate, formatPaise, formatSlotTime } from '../api.js';
import { useAuth } from '../auth.jsx';
import { useToast } from '../toast.jsx';
import { ProfileSidebar } from './Profile.jsx';

export default function MyBookings() {
  const { user, ready, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('upcoming'); // 'upcoming' | 'previous' | 'cancelled'
  const [cancelModal, setCancelModal] = useState(null); // booking object or null
  const [cancelReason, setCancelReason] = useState('Change of plans');
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      navigate('/login?next=/profile/bookings');
      return;
    }
    loadBookings();
  }, [ready, user, navigate]);

  async function loadBookings() {
    setLoading(true);
    try {
      const data = await api.myBookings();
      setBookings(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error(err.message || 'Could not load bookings');
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }

  const now = new Date();

  const categorized = useMemo(() => {
    const upcoming = [];
    const previous = [];
    const cancelled = [];

    bookings.forEach((b) => {
      const isCancelled = b.status === 'cancelled';
      const slotEnd = new Date(b.endUtc || b.startUtc || 0);

      if (isCancelled) {
        cancelled.push(b);
      } else if (slotEnd < now || b.status === 'completed' || b.status === 'no_show') {
        previous.push(b);
      } else {
        upcoming.push(b);
      }
    });

    // sort upcoming ascending (soonest first)
    upcoming.sort((a, b) => new Date(a.startUtc) - new Date(b.startUtc));
    // sort previous & cancelled descending (most recent first)
    previous.sort((a, b) => new Date(b.startUtc) - new Date(a.startUtc));
    cancelled.sort((a, b) => new Date(b.startUtc) - new Date(a.startUtc));

    return { upcoming, previous, cancelled };
  }, [bookings, now]);

  const currentList = categorized[activeTab] || [];

  function openCancel(booking) {
    setCancelModal(booking);
    setCancelReason('Change of plans');
  }

  function closeCancel() {
    if (cancelling) return;
    setCancelModal(null);
  }

  async function handleConfirmCancel() {
    if (!cancelModal) return;
    setCancelling(true);
    try {
      const res = await api.cancelBooking(cancelModal.id || cancelModal._id, {
        reason: cancelReason,
      });
      toast.success(
        res?.message || 'Booking cancelled. Any applicable refund has been credited.'
      );
      closeCancel();
      await loadBookings();
    } catch (err) {
      toast.error(err.message || 'Failed to cancel booking.');
    } finally {
      setCancelling(false);
    }
  }

  if (!ready || !user) {
    return (
      <div className="container" style={{ padding: '80px 0', textAlign: 'center' }}>
        <p className="text-muted">Loading your bookings…</p>
      </div>
    );
  }

  return (
    <section className="page container">
      <div className="profile-layout">
        <ProfileSidebar user={user} logout={logout} />

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontSize: '1.4rem' }}>My Bookings</h2>
            <Link to="/booking" className="btn btn-primary" style={{ height: 38, padding: '0 16px', fontSize: 14 }}>
              + Book Court
            </Link>
          </div>

          <div className="tabs">
            <button
              type="button"
              className={activeTab === 'upcoming' ? 'on' : ''}
              onClick={() => setActiveTab('upcoming')}
            >
              Upcoming ({categorized.upcoming.length})
            </button>
            <button
              type="button"
              className={activeTab === 'previous' ? 'on' : ''}
              onClick={() => setActiveTab('previous')}
            >
              Previous ({categorized.previous.length})
            </button>
            <button
              type="button"
              className={activeTab === 'cancelled' ? 'on' : ''}
              onClick={() => setActiveTab('cancelled')}
            >
              Cancelled ({categorized.cancelled.length})
            </button>
          </div>

          {loading ? (
            <div className="card text-center" style={{ padding: '40px 20px' }}>
              <p className="text-muted">Loading bookings…</p>
            </div>
          ) : currentList.length === 0 ? (
            <div className="card text-center" style={{ padding: '48px 24px' }}>
              <p className="text-muted" style={{ marginBottom: 16 }}>
                No {activeTab} bookings found.
              </p>
              {activeTab === 'upcoming' && (
                <Link to="/booking" className="btn btn-primary">
                  Book a Slot Now
                </Link>
              )}
            </div>
          ) : (
            <div className="history-list">
              {currentList.map((b) => {
                const sportName = b.sportName || b.sport?.name || 'Court';
                const courtName = b.courtName || b.court?.name || 'Court';
                const dateStr = b.localDate ? formatCalendarDate(b.localDate, { dateStyle: 'full' }) : formatCalendarDate(b.startUtc, { dateStyle: 'full' });
                const timeStr = `${formatSlotTime(b.startUtc)} – ${formatSlotTime(b.endUtc)}`;
                const isCancelled = b.status === 'cancelled';
                const isUpcoming = activeTab === 'upcoming';
                const amount = formatPaise(b.totalPaise || b.pricePaise || 0);

                return (
                  <article className="history-card" key={b.id || b._id}>
                    <div className="history-card-body">
                      <div className="history-title">
                        {sportName} · {courtName}
                      </div>
                      <div className="history-detail">
                        {dateStr}
                      </div>
                      <div className="history-detail" style={{ fontWeight: 600 }}>
                        {timeStr}
                      </div>
                      <div className="history-meta">
                        <span
                          className={`badge ${
                            isCancelled
                              ? 'badge-danger'
                              : b.status === 'checked_in' || b.status === 'completed'
                              ? 'badge-active'
                              : ''
                          }`}
                        >
                          {(b.status || 'confirmed').replace('_', ' ').toUpperCase()}
                        </span>
                        <span>{amount}</span>
                        {b.bookingNo && <span className="muted">#{b.bookingNo}</span>}
                      </div>
                      {isCancelled && b.cancellationReason && (
                        <div className="history-refund">
                          Reason: {b.cancellationReason}
                          {b.refundPaise != null && ` · Refunded: ${formatPaise(b.refundPaise)}`}
                        </div>
                      )}
                    </div>

                    {isUpcoming && !isCancelled && (
                      <div>
                        <button
                          type="button"
                          className="btn btn-outline"
                          style={{ height: 38, fontSize: 14 }}
                          onClick={() => openCancel(b)}
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {cancelModal && (
        <div className="modal-back" onClick={closeCancel}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460 }}>
            <button type="button" className="modal-close" onClick={closeCancel} aria-label="Close">
              ×
            </button>
            <h3 style={{ margin: '0 0 8px' }}>Cancel Booking?</h3>
            <p className="text-muted" style={{ margin: '0 0 16px', fontSize: 14 }}>
              Are you sure you want to cancel your slot for{' '}
              <strong>
                {cancelModal.sportName || cancelModal.sport?.name} ({cancelModal.courtName || cancelModal.court?.name})
              </strong>{' '}
              on {formatCalendarDate(cancelModal.localDate || cancelModal.startUtc)} at {formatSlotTime(cancelModal.startUtc)}?
            </p>

            <label className="field" style={{ marginBottom: 20 }}>
              <span>Reason for cancellation</span>
              <select value={cancelReason} onChange={(e) => setCancelReason(e.target.value)}>
                <option value="Change of plans">Change of plans</option>
                <option value="Health or injury">Health or injury</option>
                <option value="Bad weather or travel">Bad weather or travel</option>
                <option value="Booked wrong time or court">Booked wrong time or court</option>
                <option value="Other">Other</option>
              </select>
            </label>

            <div className="review-lines" style={{ marginBottom: 20 }}>
              <div>
                <span>Original Amount Paid</span>
                <strong>{formatPaise(cancelModal.totalPaise || cancelModal.pricePaise || 0)}</strong>
              </div>
              <div>
                <span>Cancellation Terms</span>
                <span className="muted" style={{ fontSize: 13 }}>Per club policy</span>
              </div>
            </div>

            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={closeCancel} disabled={cancelling}>
                Keep Booking
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ background: 'var(--danger)', borderColor: 'var(--danger)' }}
                onClick={handleConfirmCancel}
                disabled={cancelling}
              >
                {cancelling ? 'Cancelling…' : 'Confirm Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
