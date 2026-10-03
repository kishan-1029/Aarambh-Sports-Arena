import Link from 'next/link';
import { getMembershipPlans } from '@/lib/api';
import { formatPaise } from '@/lib/money';

export const revalidate = 60;

export const metadata = {
  title: 'Membership',
  description: 'Gold, Silver and Junior membership plans at Arambh Sports Arena.',
};

function tierClass(key) {
  const k = String(key || '').toLowerCase();
  if (k.includes('gold')) return 'tier-gold';
  if (k.includes('silver')) return 'tier-silver';
  if (k.includes('junior')) return 'tier-junior';
  return '';
}

export default async function MembershipPage() {
  let plans = [];
  try {
    plans = await getMembershipPlans();
  } catch {
    plans = [];
  }

  return (
    <div className="container section-tight">
      <div className="page-hero">
        <h1 className="section-title">Membership plans</h1>
        <p className="section-lead">
          Compare court access, guest passes, and member pricing. Ready to join? Talk to us or book a trial first.
        </p>
      </div>

      {plans.length === 0 ? (
        <p className="empty-note">Plans will appear when the membership catalogue is available.</p>
      ) : (
        <div className="grid-3">
          {plans.map((p) => {
            const sorted = [...(p.durations || [])].sort((a, b) => a.months - b.months);
            const highlight = sorted[sorted.length - 1] || sorted[0];
            return (
              <article key={p.id} className="tile">
                <span className={`tier-chip ${tierClass(p.key)}`}>{p.name}</span>
                <h2 style={{ fontFamily: 'var(--font-display)', margin: '0.75rem 0 0.25rem' }}>
                  {p.name}
                </h2>
                <p className="muted">{p.description || 'Member access and pricing'}</p>
                {highlight ? (
                  <p className="plan-price">
                    {formatPaise(highlight.pricePaise)}
                    <span style={{ fontSize: '0.95rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                      {' '}
                      / {highlight.months} mo
                    </span>
                  </p>
                ) : null}
                <ul className="plan-perks">
                  <li>Court access: {p.entitlements?.court?.access || 'all'}</li>
                  <li>Up to {p.entitlements?.court?.maxBookingsPerDay ?? 2} bookings / day</li>
                  <li>Book {p.entitlements?.court?.advanceBookingDays ?? 14} days ahead</li>
                  {(p.entitlements?.perks || []).slice(0, 4).map((perk) => (
                    <li key={perk}>{perk}</li>
                  ))}
                </ul>
                {sorted.length > 1 ? (
                  <p className="muted" style={{ marginTop: '0.75rem', fontSize: '0.9rem' }}>
                    Also:{' '}
                    {sorted
                      .map((d) => `${d.months} mo ${formatPaise(d.pricePaise)}`)
                      .join(' · ')}
                  </p>
                ) : null}
              </article>
            );
          })}
        </div>
      )}

      <div style={{ marginTop: '2rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <Link href="/trial" className="btn btn-primary">
          Book a trial
        </Link>
        <Link href="/contact" className="btn btn-outline">
          Talk to us
        </Link>
      </div>
    </div>
  );
}
