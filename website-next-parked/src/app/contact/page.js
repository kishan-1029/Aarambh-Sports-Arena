import EnquiryForm from '@/components/EnquiryForm';
import { getClub } from '@/lib/api';
import { formatOpeningHours } from '@/lib/time';

export const metadata = {
  title: 'Contact',
  description: 'Enquire about membership, courts, or events at Arambh Sports Arena.',
};

export default async function ContactPage() {
  let club = null;
  try {
    club = await getClub();
  } catch {
    club = null;
  }

  const hours = formatOpeningHours(club?.location?.openingHours || []);
  const phone = club?.location?.phone;
  const address = club?.location?.address;

  return (
    <div className="container section-tight">
      <div className="page-hero">
        <h1 className="section-title">Contact</h1>
        <p className="section-lead">
          Tell us what you need — membership, court hire, coaching, or a corporate booking. We respond during club hours.
        </p>
      </div>

      <div style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: 'minmax(0, 1fr)' }}>
        <EnquiryForm />
        <aside className="tile" style={{ maxWidth: 420 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', marginTop: 0 }}>Visit</h2>
          <p className="muted">{address || 'Arambh Sports Arena'}</p>
          {phone ? (
            <p>
              <a href={`tel:${phone}`} style={{ color: 'var(--brand)', fontWeight: 600 }}>
                {phone}
              </a>
            </p>
          ) : null}
          {hours.length ? (
            <>
              <p className="footer-label" style={{ marginTop: '1rem' }}>Hours</p>
              <ul className="plan-perks">
                {hours.map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
            </>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
