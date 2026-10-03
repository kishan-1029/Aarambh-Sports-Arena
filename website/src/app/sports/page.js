import Link from 'next/link';
import { getSports } from '@/lib/api';

export const revalidate = 60;

export const metadata = {
  title: 'Sports',
  description: 'Sports and courts at Arambh Sports Arena.',
};

export default async function SportsPage() {
  let sports = [];
  try {
    sports = await getSports();
  } catch {
    sports = [];
  }

  return (
    <div className="container section-tight">
      <div className="page-hero">
        <h1 className="section-title">Sports</h1>
        <p className="section-lead">
          Active sports at Arambh Sports Arena. Check the week&apos;s free slots or book a trial.
        </p>
      </div>

      {sports.length === 0 ? (
        <p className="empty-note">No sports listed yet. Seed facilities on the server to populate this page.</p>
      ) : (
        <div className="grid-3">
          {sports.map((s) => (
            <article key={s.id} className="tile">
              <h2 style={{ fontFamily: 'var(--font-display)', margin: '0 0 0.35rem' }}>{s.name}</h2>
              <p className="muted">
                {s.courtCount} court{s.courtCount === 1 ? '' : 's'} · {s.sessionMinutes}-minute sessions ·{' '}
                {s.slotStepMinutes}-minute steps
              </p>
              <div style={{ marginTop: '1rem' }}>
                <Link
                  href={`/availability?sportId=${encodeURIComponent(s.id)}`}
                  className="btn btn-outline"
                >
                  See availability
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
