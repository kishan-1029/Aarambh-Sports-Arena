'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { getSports, postTrial } from '@/lib/api';
import { formatSlotTime } from '@/lib/time';

export default function TrialForm() {
  const params = useSearchParams();
  const [sports, setSports] = useState([]);
  const [status, setStatus] = useState({ type: '', text: '' });
  const [pending, setPending] = useState(false);

  const prefill = {
    sportId: params.get('sportId') || '',
    courtId: params.get('courtId') || '',
    startUtc: params.get('startUtc') || '',
    localDate: params.get('localDate') || '',
  };

  useEffect(() => {
    getSports()
      .then(setSports)
      .catch(() => setSports([]));
  }, []);

  async function onSubmit(e) {
    e.preventDefault();
    setPending(true);
    setStatus({ type: '', text: '' });
    const fd = new FormData(e.currentTarget);
    const body = {
      name: String(fd.get('name') || '').trim(),
      phone: String(fd.get('phone') || '').trim(),
      email: String(fd.get('email') || '').trim(),
      message: String(fd.get('message') || '').trim(),
      sportId: String(fd.get('sportId') || '') || undefined,
      courtId: prefill.courtId || undefined,
      startUtc: prefill.startUtc || undefined,
      localDate: prefill.localDate || undefined,
      website: String(fd.get('website') || ''),
      interest: ['trial'],
    };

    try {
      const data = await postTrial(body);
      const bookingBit = data.booking?.bookingNo
        ? ` Booking ${data.booking.bookingNo}.`
        : '';
      setStatus({
        type: 'ok',
        text: `${data.message || 'Thanks!'}${bookingBit} Reference: ${data.leadNo}`,
      });
      e.currentTarget.reset();
    } catch (err) {
      setStatus({ type: 'err', text: err.message || 'Could not book trial' });
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="form-card form-stack" onSubmit={onSubmit}>
      {prefill.startUtc ? (
        <p className="form-msg ok">
          Selected slot: {formatSlotTime(prefill.startUtc)}
          {prefill.localDate ? ` on ${prefill.localDate}` : ''}
          {prefill.courtId ? ' (court reserved on submit if free)' : ''}
        </p>
      ) : (
        <p className="muted">
          Pick a free slot on{' '}
          <a href="/availability" style={{ color: 'var(--brand)', textDecoration: 'underline' }}>
            Availability
          </a>{' '}
          or leave the slot blank — we&apos;ll call to confirm.
        </p>
      )}

      <label>
        Name
        <input name="name" required maxLength={120} autoComplete="name" />
      </label>
      <label>
        Phone
        <input name="phone" required maxLength={32} autoComplete="tel" />
      </label>
      <label>
        Email
        <input name="email" type="email" maxLength={160} autoComplete="email" />
      </label>
      <label>
        Sport
        <select name="sportId" defaultValue={prefill.sportId}>
          <option value="">Any / not sure</option>
          {sports.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Notes
        <textarea name="message" maxLength={2000} placeholder="Preferred times, level, etc." />
      </label>
      <label className="hp" aria-hidden>
        Website
        <input name="website" tabIndex={-1} autoComplete="off" />
      </label>
      {status.text ? (
        <p className={`form-msg ${status.type === 'ok' ? 'ok' : 'err'}`}>{status.text}</p>
      ) : null}
      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? 'Submitting…' : 'Request trial'}
      </button>
    </form>
  );
}
