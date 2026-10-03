const KEY = 'aarambh_pending_booking';

export function savePendingBooking(payload) {
  if (!payload) return;
  try {
    sessionStorage.setItem(KEY, JSON.stringify(payload));
  } catch {}
}

export function getPendingBooking() {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearPendingBooking() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {}
}

export function bookingPath(payload) {
  if (!payload) return '/booking';
  const query = new URLSearchParams();
  if (payload.sportId) query.set('sportId', payload.sportId);
  if (payload.courtId) query.set('courtId', payload.courtId);
  if (payload.date) query.set('date', payload.date);
  if (payload.start) query.set('start', payload.start);
  const qs = query.toString();
  return qs ? `/booking?${qs}` : '/booking';
}
