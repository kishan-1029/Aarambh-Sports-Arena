import Link from 'next/link';

export default function SiteFooter({ club }) {
  const phone = club?.location?.phone;
  const address = club?.location?.address;

  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div>
          <p className="footer-brand">Arambh Sports Arena</p>
          <p className="muted">
            Courts, memberships, and a place to play — built for members who show up.
          </p>
        </div>
        <div>
          <p className="footer-label">Explore</p>
          <ul className="footer-links">
            <li><Link href="/sports">Sports</Link></li>
            <li><Link href="/availability">Availability</Link></li>
            <li><Link href="/membership">Membership</Link></li>
            <li><Link href="/trial">Book a trial</Link></li>
            <li><Link href="/contact">Contact</Link></li>
          </ul>
        </div>
        <div>
          <p className="footer-label">Visit</p>
          {address ? <p className="muted">{address}</p> : <p className="muted">Main club location</p>}
          {phone ? (
            <p>
              <a href={`tel:${phone}`}>{phone}</a>
            </p>
          ) : null}
        </div>
      </div>
      <div className="container footer-bottom">
        <span>© {new Date().getFullYear()} Arambh Sports Arena</span>
      </div>
    </footer>
  );
}
