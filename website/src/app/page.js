import Link from 'next/link';
import { getClub, getSports, getMembershipPlans } from '@/lib/api';
import { formatPaise } from '@/lib/money';
import { formatOpeningHours } from '@/lib/time';

export const revalidate = 60;

async function safe(fn, fallback) {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

export default async function HomePage() {
  const [club, sports, plans] = await Promise.all([
    safe(getClub, { name: 'Arambh Sports Arena', location: null }),
    safe(getSports, []),
    safe(getMembershipPlans, []),
  ]);

  const hours = formatOpeningHours(club?.location?.openingHours || []);

  return (
    <>
      <section className="hero">
        <div className="hero-inner">
          <h1 className="hero-brand">Arambh Sports Arena</h1>
          <p className="hero-lead">
            Courts ready when you are. See what&apos;s free this week, pick a plan, or book a trial.
          </p>
          <div className="hero-actions">
            <Link href="/trial" className="btn btn-primary">
              Book a trial
            </Link>
            <Link href="/availability" className="btn btn-secondary">
              See availability
            </Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <h2 className="section-title">Sports on court</h2>
          <p className="section-lead">
            Active sports at the club — open a sport page or jump straight to the week&apos;s free slots.
          </p>
          {sports.length === 0 ? (
            <p className="empty-note">Sports will appear once the club catalogue is seeded.</p>
          ) : (
            <div className="grid-3">
              {sports.slice(0, 6).map((s) => (
                <Link key={s.id} href="/sports" className="tile">
                  <h3>{s.name}</h3>
                  <p>
                    {s.courtCount} court{s.courtCount === 1 ? '' : 's'} · {s.sessionMinutes} min sessions
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="section band">
        <div className="container">
          <h2 className="section-title">Membership</h2>
          <p className="section-lead">
            Gold, Silver, and Junior plans with court access and member pricing.
          </p>
          {plans.length === 0 ? (
            <p className="empty-note" style={{ color: 'rgba(238,244,240,0.8)' }}>
              Plans load from the public API when available.
            </p>
          ) : (
            <div className="grid-3">
              {plans.slice(0, 3).map((p) => {
                const cheapest = [...(p.durations || [])].sort(
                  (a, b) => a.pricePaise - b.pricePaise,
                )[0];
                return (
                  <div key={p.id} className="tile" style={{ background: '#132a36', borderColor: '#2a4554', color: '#eef4f0' }}>
                    <h3 style={{ color: '#fff' }}>{p.name}</h3>
                    <p style={{ color: 'rgba(238,244,240,0.7)' }}>
                      {cheapest
                        ? `From ${formatPaise(cheapest.pricePaise)} / ${cheapest.months} mo`
                        : p.description || 'Member benefits'}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
          <div style={{ marginTop: '1.5rem' }}>
            <Link href="/membership" className="btn btn-primary">
              Compare plans
            </Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container cta-band">
          <div>
            <h2 className="section-title">Visit the club</h2>
            <p className="section-lead" style={{ marginBottom: 0 }}>
              {club?.location?.address || 'Arambh Sports Arena'}
              {hours[0] ? ` · ${hours[0]}` : ''}
            </p>
          </div>
          <Link href="/contact" className="btn btn-outline">
            Talk to us
          </Link>
        </div>
      </section>
    </>
  );
}
