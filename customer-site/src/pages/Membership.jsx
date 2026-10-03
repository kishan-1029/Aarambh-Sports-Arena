import { useEffect, useState } from 'react';
import { api } from '../api';
import PlanCard from '../components/PlanCard.jsx';

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
        <p>Honest pricing in rupees. The points on each card are the benefits set on that plan.</p>
      </header>
      <section className="section">
        {loading && <div className="skeleton" />}
        {error && <div className="msg msg-err">{error}</div>}
        <div className="plan-grid">
          {plans.map((p, idx) => (
            <PlanCard key={p.id || p.key} plan={p} featured={idx === 0} action="trial" />
          ))}
        </div>
        {!loading && !error && plans.length === 0 && (
          <div className="empty">Plans will appear here once published from the club admin.</div>
        )}
      </section>
    </>
  );
}
