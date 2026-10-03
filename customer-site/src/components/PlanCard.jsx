import { Link } from 'react-router-dom';
import { formatPaise, planMonthlyPaise } from '../api';

function otherDurations(plan) {
  return (plan.durations || []).filter((d) => d.months !== 1 && d.pricePaise != null);
}

export default function PlanCard({ plan, featured = false, action = 'trial' }) {
  const perks = plan.entitlements?.perks || [];
  const extras = otherDurations(plan);
  const to = action === 'compare' ? '/membership' : '/trial';
  const label = action === 'compare' ? 'Compare plans' : 'Start with a trial';

  return (
    <article className={`plan${featured ? ' featured' : ''}`}>
      <div className="plan-copy">
        <span className="tag">{plan.key || 'plan'}</span>
        <h3>{plan.name}</h3>
        <p className="plan-desc">{plan.description || 'Club membership'}</p>
      </div>
      <div className="price">
        {formatPaise(planMonthlyPaise(plan))}
        <small>from / month</small>
      </div>
      <p className="plan-terms">
        {extras.length
          ? `Also ${extras.map((d) => `${d.months} mo ${formatPaise(d.pricePaise)}`).join(' · ')}`
          : 'Monthly term'}
      </p>
      <ul className="perk-list">
        {perks.map((perk) => (
          <li key={perk}>{perk}</li>
        ))}
      </ul>
      <Link className={`btn plan-cta ${featured ? 'btn-primary' : 'btn-outline'}`} to={to}>
        {label}
      </Link>
    </article>
  );
}
