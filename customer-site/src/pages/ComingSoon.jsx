import { Link } from 'react-router-dom';

export default function ComingSoon({ title = 'Coming Soon', subtitle = 'We are putting the finishing touches on this experience. Check back soon!' }) {
  return (
    <section className="page container">
      <div className="card text-center" style={{ maxWidth: 640, margin: '60px auto', padding: '48px 32px' }}>
        <span className="badge badge-accent" style={{ marginBottom: 16 }}>Under Development</span>
        <h1 style={{ fontSize: '2rem', marginBottom: 12 }}>{title}</h1>
        <p className="text-muted" style={{ marginBottom: 28, fontSize: '1.05rem', lineHeight: 1.6 }}>
          {subtitle}
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <Link to="/" className="btn btn-secondary">
            Back to Home
          </Link>
          <Link to="/availability" className="btn btn-primary">
            Check Court Availability
          </Link>
        </div>
      </div>
    </section>
  );
}
