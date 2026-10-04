'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { getAvailability, getSports } from '@/lib/api';
import { addLocalDays, formatLocalDateLabel, formatSlotTime, todayIst } from '@/lib/time';

export default function AvailabilityGrid() {
  const searchParams = useSearchParams();
  const start = todayIst();
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addLocalDays(start, i)),
    [start],
  );

  const [localDate, setLocalDate] = useState(start);
  const [sportId, setSportId] = useState(searchParams.get('sportId') || '');
  const [sports, setSports] = useState([]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getSports()
      .then(setSports)
      .catch(() => setSports([]));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    getAvailability({ localDate, sportId: sportId || undefined })
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((e) => {
        if (!cancelled) {
          setData(null);
          setError(e.message || 'Could not load availability');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [localDate, sportId]);

  return (
    <div>
      <div className="filters">
        <label style={{ minWidth: 200 }}>
          Sport
          <select value={sportId} onChange={(e) => setSportId(e.target.value)}>
            <option value="">All sports</option>
            {sports.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label style={{ minWidth: 200 }}>
          Date
          <input
            type="date"
            value={localDate}
            min={start}
            max={addLocalDays(start, 13)}
            onChange={(e) => setLocalDate(e.target.value)}
          />
        </label>
      </div>

      <div className="day-tabs" role="tablist" aria-label="Next 7 days">
        {days.map((d) => (
          <button
            key={d}
            type="button"
            className={`day-tab${d === localDate ? ' is-active' : ''}`}
            onClick={() => setLocalDate(d)}
          >
            {formatLocalDateLabel(d)}
          </button>
        ))}
      </div>

      <div className="legend">
        <span>
          <i className="free" /> Free
        </span>
        <span>
          <i className="busy" /> Busy / past
        </span>
      </div>

      {loading ? <p className="muted">Loading slots…</p> : null}
      {error ? <p className="form-msg err">{error}</p> : null}

      {!loading && !error && data?.courts?.length === 0 ? (
        <p className="empty-note">No courts for this filter. Try another sport or day.</p>
      ) : null}

      {(data?.courts || []).map((court) => (
        <div key={court.courtId} className="court-block">
          <h3>
            {court.code}
            {court.sportKey ? ` · ${court.sportKey}` : ''}
          </h3>
          <div className="slot-grid">
            {(court.slots || []).map((slot) => {
              const free = slot.status === 'available';
              const cls = free ? 'available' : slot.status === 'past' ? 'past' : 'busy';
              const content = (
                <div key={`${court.courtId}-${slot.start}`} className={`slot ${cls}`}>
                  {formatSlotTime(slot.start)}
                </div>
              );
              if (!free) return content;
              const q = new URLSearchParams({
                courtId: court.courtId,
                sportId: court.sportId || '',
                startUtc: new Date(slot.start).toISOString(),
                localDate,
              });
              return (
                <Link key={`${court.courtId}-${slot.start}`} href={`/trial?${q}`}>
                  {content}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
