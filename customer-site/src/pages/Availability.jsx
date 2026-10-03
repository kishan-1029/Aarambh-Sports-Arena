import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, todayLocalIST } from '../api';

function formatSlotTime(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Asia/Kolkata',
    });
  } catch {
    return String(iso).slice(11, 16);
  }
}

export default function Availability() {
  const [params] = useSearchParams();
  const [localDate, setLocalDate] = useState(todayLocalIST);
  const [sportId, setSportId] = useState(params.get('sportId') || '');
  const [sports, setSports] = useState([]);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.sports().then((d) => setSports(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    setError('');
    api
      .availability({ localDate, days: '1', sportId: sportId || undefined })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [localDate, sportId]);

  // Public API returns a single day object when days=1, or { days: [...] } when days>1
  const day = useMemo(() => {
    if (!data) return null;
    if (Array.isArray(data.days) && data.days[0]) return data.days[0];
    if (Array.isArray(data.courts)) return data;
    return null;
  }, [data]);
  const courts = day?.courts || [];

  return (
    <>
      <header className="page-hero">
        <h1>Live availability</h1>
        <p>Free or busy only — no member names. Pick a date, filter by sport, book a trial for an open slot.</p>
      </header>
      <section className="section">
        <div className="toolbar">
          <label className="field">
            Date
            <input type="date" value={localDate} onChange={(e) => setLocalDate(e.target.value)} />
          </label>
          <label className="field">
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
          <Link className="btn btn-solid" to="/trial">
            Book a trial
          </Link>
        </div>

        <div className="legend">
          <span>
            <i className="free" /> Available
          </span>
          <span>
            <i className="busy" /> Busy / held
          </span>
        </div>

        {loading && <div className="skeleton" />}
        {error && <div className="msg msg-err">{error}</div>}

        {!loading && !error && courts.length === 0 && (
          <div className="empty">
            No court grid for this date. Try another day, or{' '}
            <Link to="/trial">request a trial</Link> and the desk will place you.
          </div>
        )}

        {courts.map((c) => (
          <div className="court-block" key={c.courtId || c.code}>
            <h3>
              {c.code || 'Court'}{' '}
              <span style={{ color: 'var(--muted)', fontSize: '0.9rem', fontFamily: 'var(--font-body)' }}>
                · {c.sportKey || 'sport'}
              </span>
            </h3>
            <div className="slot-grid">
              {(c.slots || []).map((s, i) => {
                const status = s.status || 'busy';
                const cls =
                  status === 'available' ? 'slot-free' : status === 'past' ? 'slot-past' : 'slot-busy';
                return (
                  <div key={`${c.courtId}-${s.start || i}`} className={`slot ${cls}`} title={status}>
                    {formatSlotTime(s.start)}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </section>
    </>
  );
}
