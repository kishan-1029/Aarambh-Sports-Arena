import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

export default function Sports() {
  const [sports, setSports] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .sports()
      .then((d) => setSports(Array.isArray(d) ? d : []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <header className="page-hero">
        <h1>Sports & courts</h1>
        <p>Pick a discipline, then jump into live availability for tonight or this week.</p>
      </header>
      <section className="section">
        {loading && <div className="skeleton" />}
        {error && <div className="msg msg-err">{error}</div>}
        {!loading && !error && sports.length === 0 && (
          <div className="empty">Sports data is syncing — book a trial and we will place you on a court.</div>
        )}
        <div className="sport-grid">
          {sports.map((s) => (
            <article className="sport-card" key={s.id || s.key}>
              <span className="chip">{s.key}</span>
              <h3>{s.name}</h3>
              <p>
                {s.courtCount} active court{s.courtCount === 1 ? '' : 's'} · {s.sessionMinutes || 60}{' '}
                minute sessions · slots every {s.slotStepMinutes || 30} min
              </p>
              <Link className="btn btn-solid" to={`/availability?sportId=${encodeURIComponent(s.id)}`}>
                View slots
              </Link>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
