import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, formatPaise, planMonthlyPaise } from '../api';

export default function Membership() {
  const [plans, setPlans] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .plans()
      .then((d) => setPlans(Array.isArray(d) ? d : []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <header className="page-hero">
        <h1>Membership plans</h1>
        <p>Honest pricing in rupees. Court access, guest passes and member rates — no fine print theatre.</p>
      </header>
      <section className="section">
        {loading && <div className="skeleton" />}
        {error && <div className="msg msg-err">{error}</div>}
        <div className="plan-grid">
          {plans.map((p, idx) => {
            const monthly = planMonthlyPaise(p);
            const perks = [
              ...(p.entitlements?.perks || []),
              p.entitlements?.guestPasses
                ? `${p.entitlements.guestPasses} guest pass${p.entitlements.guestPasses === 1 ? '' : 'es'}`
                : null,
              p.entitlements?.court?.maxBookingsPerDay
                ? `Up to ${p.entitlements.court.maxBookingsPerDay} bookings / day`
                : null,
              p.entitlements?.shopDiscountPct
                ? `${p.entitlements.shopDiscountPct}% shop discount`
                : null,
            ].filter(Boolean);

            return (
              <article className={`plan ${idx === 0 ? 'featured' : ''}`} key={p.id || p.key}>
                <span className="tag">{p.key}</span>
                <h3>{p.name}</h3>
                <p>{p.description || 'Club membership'}</p>
                <div className="price">
                  {formatPaise(monthly)}
                  <small>from / month</small>
                </div>
                {(p.durations || []).length > 1 && (
                  <p style={{ fontSize: '0.88rem', margin: 0 }}>
                    Also {(p.durations || [])
                      .filter((d) => d.months !== 1)
                      .map((d) => `${d.months} mo ${formatPaise(d.pricePaise)}`)
                      .join(' · ')}
                  </p>
                )}
                <ul className="perk-list">
                  {perks.slice(0, 6).map((perk) => (
                    <li key={perk}>{perk}</li>
                  ))}
                </ul>
                <Link className={`btn ${idx === 0 ? 'btn-primary' : 'btn-outline'}`} to="/trial">
                  Start with a trial
                </Link>
              </article>
            );
          })}
        </div>
        {!loading && !error && plans.length === 0 && (
          <div className="empty">Plans will appear here once published from the club admin.</div>
        )}
      </section>
    </>
  );
}
