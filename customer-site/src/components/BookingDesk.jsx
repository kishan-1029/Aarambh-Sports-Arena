import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  api,
  formatCalendarDate,
  formatPaise,
  formatSlotTime,
  shiftDate,
  todayLocalIST,
} from '../api';
import { useAuth } from '../auth';
import { useAuthDialog } from '../authDialog';
import { bookingPath, clearPendingBooking, savePendingBooking } from '../bookingDraft';
import { SkeletonSlots } from './Skeleton.jsx';
import { useToast } from '../toast';

const ADVANCE_DAYS = 14;
const FALLBACK_METHODS = [
  { id: 'upi', label: 'UPI', hint: 'Google Pay / PhonePe / UPI apps' },
  { id: 'card', label: 'Card', hint: 'Debit or credit card' },
  { id: 'netbanking', label: 'Net banking', hint: 'Pay using your bank' },
];

function courtLabel(court) {
  return court?.name || court?.code || 'Court';
}

function courtState(court) {
  const slots = court?.slots || [];
  if (!slots.length) return 'Unavailable';
  if (slots.some((slot) => slot.status === 'available')) return 'Available';
  if (slots.every((slot) => slot.status === 'past')) return 'Closed';
  return 'Unavailable';
}

function loadError(err) {
  const message = err?.message || '';
  if (!message || /failed to fetch|couldn't reach|network/i.test(message)) {
    return "We couldn't load court availability.";
  }
  return message;
}

export default function BookingDesk({ mode = 'public' }) {
  const { user } = useAuth();
  const { openAuth } = useAuthDialog();
  const toast = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const today = todayLocalIST();
  const [sports, setSports] = useState([]);
  const [sportId, setSportId] = useState(params.get('sportId') || '');
  const [courtId, setCourtId] = useState(params.get('courtId') || '');
  const [localDate, setLocalDate] = useState(params.get('date') || today);
  const [windowStart, setWindowStart] = useState(params.get('date') || today);
  const [day, setDay] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [shake, setShake] = useState('');
  const [hint, setHint] = useState('');
  const [quote, setQuote] = useState(null);
  const [quoteError, setQuoteError] = useState('');
  const [payOpen, setPayOpen] = useState(false);
  const [methods, setMethods] = useState(FALLBACK_METHODS);
  const [method, setMethod] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const restored = useRef(false);

  useEffect(() => {
    api.sports()
      .then((rows) => setSports(Array.isArray(rows) ? rows : []))
      .catch((err) => setError(loadError(err)));
    api.cancellationPolicy()
      .then((policy) => {
        if (policy?.paymentMethods?.length) setMethods(policy.paymentMethods);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!sportId) {
      setDay(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    api.availability({ localDate, days: 1, sportId })
      .then((data) => {
        const next = Array.isArray(data?.courts) ? data : data?.days?.[0] || null;
        setDay(next);
        setCourtId((current) => {
          const courts = next?.courts || [];
          if (current && courts.some((c) => c.courtId === current)) return current;
          return '';
        });
      })
      .catch((err) => setError(loadError(err)))
      .finally(() => setLoading(false));
  }, [localDate, sportId, reloadKey]);

  const courts = day?.courts || [];
  const court = courts.find((c) => c.courtId === courtId) || null;
  const slots = court?.slots || [];
  const sport = sports.find((s) => s.id === sportId);
  const closed = court ? courtState(court) === 'Closed' : false;

  useEffect(() => {
    const start = params.get('start');
    if (restored.current || !start || !court || mode !== 'portal') return;
    const slot = (court.slots || []).find((s) => s.start === start && s.status === 'available');
    if (!slot) return;
    restored.current = true;
    setSelected({ ...slot, courtId: court.courtId, courtName: courtLabel(court), sportName: sport?.name || court.sportKey });
    setPayOpen(true);
  }, [court, params, sport?.name, mode]);

  useEffect(() => {
    if (!user || !selected || mode !== 'portal') {
      setQuote(null);
      return;
    }
    let alive = true;
    setQuoteError('');
    api.quoteSlot({ courtId: selected.courtId, startUtc: selected.start })
      .then((data) => { if (alive) setQuote(data); })
      .catch((err) => { if (alive) setQuoteError(err.message); });
    return () => { alive = false; };
  }, [user, selected, mode]);

  const dates = useMemo(() => {
    const start = windowStart < today ? today : windowStart;
    return Array.from({ length: 7 }, (_, i) => shiftDate(start, i)).filter((iso) => iso <= shiftDate(today, ADVANCE_DAYS));
  }, [windowStart, today]);

  const pickDate = (iso) => {
    if (!iso || iso < today || iso > shiftDate(today, ADVANCE_DAYS)) return;
    setLocalDate(iso);
    setSelected(null);
    setHint('');
    setPayOpen(false);
  };

  const onSlot = (slot) => {
    if (closed || slot.status !== 'available') {
      setShake(slot.start);
      setHint(slot.status === 'past' || closed ? 'This time is no longer available.' : 'This time is already booked.');
      window.setTimeout(() => setShake(''), 280);
      return;
    }
    setHint('');
    const next = {
      ...slot,
      courtId: court.courtId,
      courtName: courtLabel(court),
      sportName: sport?.name || court.sportKey || 'Court',
    };
    setSelected(next);
    if (mode === 'portal') {
      setMethod('');
      setDone(null);
      setPayOpen(true);
    }
  };

  const selectionPayload = selected
    ? { sportId, courtId: selected.courtId, date: localDate, start: selected.start }
    : null;

  const continuePublic = () => {
    if (!selected) return;
    savePendingBooking(selectionPayload);
    if (!user) {
      openAuth({ mode: 'login', next: bookingPath(selectionPayload) });
      return;
    }
    navigate(bookingPath(selectionPayload));
  };

  const included = quote && quote.totalPaise === 0;
  const confirm = async () => {
    if (!selected || busy) return;
    if (!included && !method) return;
    setBusy(true);
    setError('');
    try {
      const created = await api.bookSlot({
        courtId: selected.courtId,
        startUtc: selected.start,
        ...(included ? {} : { paymentMethod: method }),
        idempotencyKey: `${user.id}:${selected.courtId}:${selected.start}`,
      });
      clearPendingBooking();
      setDone(created);
      toast.success(`Booking ${created.bookingNo || ''} confirmed!`);
      window.setTimeout(() => navigate('/profile/bookings'), 1600);
    } catch (err) {
      setError(err.message);
      toast.error(err.message || 'Failed to complete booking.');
    } finally {
      setBusy(false);
    }
  };

  const maxDate = shiftDate(today, ADVANCE_DAYS);
  const monthLabel = formatCalendarDate(localDate, { month: 'long', year: 'numeric' });

  return (
    <div className="page container">
      <div className="desk">
        <header className="page-hero">
          <h1>{mode === 'portal' ? 'Book a Court' : 'Live Availability'}</h1>
          <p>
            {mode === 'portal'
              ? 'Choose a sport, then a court, then a date. Sessions last 1 hour and start every 30 minutes.'
              : 'Check open courts before signing in.'}
          </p>
        </header>

        <section className="step">
          <h2>Select Sport</h2>
          <div className="choice-row" role="listbox" aria-label="Sports">
            {sports.map((item) => (
              <button
                key={item.id}
                type="button"
                className={item.id === sportId ? 'choice selected' : 'choice'}
                onClick={() => {
                  setSportId(item.id);
                  setCourtId('');
                  setSelected(null);
                  setPayOpen(false);
                  setHint('');
                }}
              >
                {item.name}
              </button>
            ))}
          </div>
        </section>

        {sportId && (
          <section className="step reveal">
            <h2>Select Court</h2>
            {loading && !courts.length && <SkeletonSlots count={4} />}
            {error && (
              <div className="msg msg-err">
                {error}
                <div style={{ marginTop: 10 }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setReloadKey((n) => n + 1)}>Try Again</button>
                </div>
              </div>
            )}
            {!loading && !error && courts.length === 0 && (
              <div className="empty">No courts are published for this sport.</div>
            )}
            <div className="choice-row">
              {courts.map((item) => {
                const stateLabel = courtState(item);
                const open = stateLabel === 'Available';
                return (
                  <button
                    key={item.courtId}
                    type="button"
                    className={item.courtId === courtId ? 'choice selected' : 'choice'}
                    onClick={() => { setCourtId(item.courtId); setSelected(null); setPayOpen(false); setHint(''); }}
                  >
                    <span className={open ? 'dot on' : 'dot off'} aria-hidden="true" />
                    {courtLabel(item)}
                    <small>{stateLabel}</small>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {courtId && court && (
          <section className="step reveal">
            <h2>Select Date</h2>
            <div className="date-bar">
              <div className="month-label">{monthLabel}</div>
              <div className="date-scroll">
                {dates.map((iso) => (
                  <button key={iso} type="button" className={iso === localDate ? 'date-chip on' : 'date-chip'} onClick={() => pickDate(iso)}>
                    <strong>{iso === today ? 'Today' : formatCalendarDate(iso, { day: '2-digit' })}</strong>
                    <span>{formatCalendarDate(iso, { weekday: 'short' })}</span>
                  </button>
                ))}
              </div>
              <button type="button" className="icon-btn" aria-label="Earlier dates" onClick={() => setWindowStart(shiftDate(windowStart, -7))} disabled={windowStart <= today}>‹</button>
              <button type="button" className="icon-btn" aria-label="Later dates" onClick={() => setWindowStart(shiftDate(windowStart, 7))} disabled={shiftDate(windowStart, 7) > maxDate}>›</button>
              <input className="date-input" aria-label="Calendar" type="date" min={today} max={maxDate} value={localDate} onChange={(e) => pickDate(e.target.value)} />
            </div>

            <h2>Available Times</h2>
            {loading && <SkeletonSlots />}
            {closed && <div className="msg">This court is closed for the selected date.</div>}
            {hint && <div className="msg msg-err" role="status">{hint}</div>}
            <div className="slot-grid">
              {slots.map((slot) => {
                const state = slot.status === 'available'
                  ? 'slot'
                  : slot.status === 'past'
                    ? 'slot slot-past'
                    : 'slot slot-busy';
                const picked = selected?.start === slot.start && selected?.courtId === courtId;
                const label = slot.status === 'busy' ? 'Booked' : slot.status === 'past' ? 'Past' : 'Available';
                return (
                  <button
                    key={slot.start}
                    type="button"
                    className={`${picked ? 'slot slot-selected' : state}${shake === slot.start ? ' slot-shake slot-bad' : ''}`}
                    aria-pressed={picked}
                    aria-disabled={slot.status !== 'available' || closed}
                    onClick={() => onSlot(slot)}
                  >
                    {formatSlotTime(slot.start)}
                    <small>{picked ? 'Selected' : label}</small>
                  </button>
                );
              })}
            </div>
            {!loading && slots.length === 0 && <div className="empty">No times are published for this court on the selected date.</div>}
            {mode === 'public' && selected && (
              <div className="slot-cta">
                <button className="btn btn-primary" type="button" onClick={continuePublic}>Book this slot</button>
              </div>
            )}
          </section>
        )}
      </div>

      {payOpen && selected && (
        <div className="modal-back" role="presentation" onClick={() => !busy && setPayOpen(false)}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="pay-title" onClick={(e) => e.stopPropagation()}>
            {done ? (
              <>
                <h2 id="pay-title">Booking Confirmed ✓</h2>
                <div className="review-lines">
                  <div><span>Booking ID</span><strong>{done.bookingNo}</strong></div>
                  <div><span>Court</span><strong>{done.courtName || selected.courtName}</strong></div>
                  <div><span>Date</span><strong>{formatCalendarDate(localDate, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</strong></div>
                  <div><span>Time</span><strong>{formatSlotTime(done.start || selected.start)} – {formatSlotTime(done.end || selected.end)}</strong></div>
                  <div><span>Amount</span><strong>{formatPaise(done.totalPaise ?? quote?.totalPaise)}</strong></div>
                </div>
                <div className="modal-actions">
                  <Link className="btn btn-primary" to="/profile/bookings">View My Bookings</Link>
                </div>
              </>
            ) : (
              <>
                <h2 id="pay-title">Confirm Your Booking</h2>
                <div className="review-lines">
                  <div><span>Sport</span><strong>{selected.sportName}</strong></div>
                  <div><span>Court</span><strong>{selected.courtName}</strong></div>
                  <div><span>Date</span><strong>{formatCalendarDate(localDate, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</strong></div>
                  <div><span>Time</span><strong>{formatSlotTime(selected.start)} – {formatSlotTime(selected.end)}</strong></div>
                  {user && <div><span>Member</span><strong>{user.firstName} {user.lastName}</strong></div>}
                  {user && <div><span>Membership</span><strong>{user.premium ? user.tierKey : 'None'}</strong></div>}
                  <div><span>Booking Price</span><strong>{quote ? formatPaise(quote.totalPaise) : '…'}</strong></div>
                </div>
                {quoteError && <div className="msg msg-err">{quoteError}</div>}
                {error && <div className="msg msg-err">{error}</div>}
                {included ? (
                  <p className="msg msg-ok">{user?.tierKey === 'gold' ? 'Included with Gold Membership' : 'Included with your membership'}</p>
                ) : (
                  <>
                    <h3 style={{ margin: '12px 0 8px', fontSize: 16 }}>Payment Method</h3>
                    <div className="method-row">
                      {methods.map((item) => (
                        <button key={item.id} type="button" className={method === item.id ? 'pay-option on' : 'pay-option'} onClick={() => setMethod(item.id)}>
                          <strong>{item.label}</strong>
                          <span>{item.hint || ''}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
                <div className="modal-actions">
                  <button className="btn btn-secondary" type="button" disabled={busy} onClick={() => setPayOpen(false)}>Cancel</button>
                  <button className="btn btn-primary" type="button" disabled={busy || (!included && !method) || !quote} onClick={confirm}>
                    {busy ? 'Confirming…' : 'Confirm Booking'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
