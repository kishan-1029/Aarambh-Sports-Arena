import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { SkeletonCards } from '../components/Skeleton.jsx';

export default function Sports() {
  const [sports, setSports] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.sports()
      .then((rows) => setSports(Array.isArray(rows) ? rows : []))
      .catch(() => setError("We couldn't load sports."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="page container">
      <header className="page-hero">
        <h1>Sports</h1>
        <p>Explore the sports and courts available at Aarambh Sports Arena.</p>
      </header>
      {loading && <SkeletonCards count={4} />}
      {error && <div className="msg msg-err">{error}</div>}
      {!loading && !error && sports.length === 0 && <div className="empty">No sports are currently available.</div>}
      <div className="sport-grid">
        {sports.map((sport) => (
          <article className="sport-card" key={sport.id}>
            <span className="chip">{sport.key}</span>
            <h3>{sport.name}</h3>
            {sport.courtCount > 0 ? (
              <>
                <p className="muted">{`${sport.courtCount} ${sport.courtCount === 1 ? 'court' : 'courts'}`}</p>
                <p className="muted">{sport.sessionMinutes || 60}-minute sessions</p>
                <p className="muted">Starts every {sport.slotStepMinutes || 30} minutes</p>
              </>
            ) : (
              <p className="muted">Currently unavailable</p>
            )}
            {sport.courtCount > 0 ? (
              <Link className="btn btn-primary" to={`/availability?sportId=${encodeURIComponent(sport.id)}`}>View Availability</Link>
            ) : (
              <span className="btn btn-secondary" aria-disabled="true">Currently unavailable</span>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
