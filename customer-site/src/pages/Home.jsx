import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, formatPaise, planMonthlyPaise } from '../api';
import { SkeletonCards } from '../components/Skeleton.jsx';
import { useToast } from '../toast';
import { isEmail, isName, mobileError, normalizeEmail, normalizeMobile, trimName } from '../validate';

const INTERESTS = [
  { id: 'membership', label: 'Membership' },
  { id: 'trial', label: 'Trial' },
  { id: 'coaching', label: 'Coaching' },
  { id: 'corporate', label: 'Corporate / Events' },
  { id: 'other', label: 'Other' },
];

function planPerks(plan) {
  return [
    ...(plan.entitlements?.perks || []),
    plan.entitlements?.court?.maxBookingsPerDay
      ? `Up to ${plan.entitlements.court.maxBookingsPerDay} bookings a day`
      : null,
    plan.entitlements?.court?.advanceBookingDays
      ? `Book up to ${plan.entitlements.court.advanceBookingDays} days ahead`
      : null,
    plan.entitlements?.shopDiscountPct ? `${plan.entitlements.shopDiscountPct}% shop discount` : null,
    plan.entitlements?.barDiscountPct ? `${plan.entitlements.barDiscountPct}% café discount` : null,
    plan.entitlements?.guestPasses ? `${plan.entitlements.guestPasses} guest passes` : null,
  ].filter(Boolean);
}

function addressLine(location) {
  const address = location?.address;
  if (!address) return 'Vadodara, Gujarat';
  if (typeof address === 'string') return address;
  return [address.line1, address.city, address.state].filter(Boolean).join(', ') || 'Vadodara, Gujarat';
}

function Field({ label, error, className = '', children }) {
  return (
    <label className={`field${className ? ` ${className}` : ''}${error ? ' invalid' : ''}`}>
      <span>{label}</span>
      {children}
      {error && <small className="field-error">{error}</small>}
    </label>
  );
}

export default function Home() {
  const toast = useToast();
  const [sports, setSports] = useState([]);
  const [plans, setPlans] = useState([]);
  const [club, setClub] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', phone: '', email: '', interest: '', message: '', consent: false });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    Promise.allSettled([api.club(), api.sports(), api.plans()]).then(([clubRes, sportsRes, plansRes]) => {
      if (!alive) return;
      if (clubRes.status === 'fulfilled') setClub(clubRes.value);
      if (sportsRes.status === 'fulfilled') setSports(Array.isArray(sportsRes.value) ? sportsRes.value : []);
      else setError(sportsRes.reason?.message || "We couldn't reach the club just now. Please try again.");
      if (plansRes.status === 'fulfilled') setPlans(Array.isArray(plansRes.value) ? plansRes.value : []);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  const loc = club?.location;
  const address = addressLine(loc);

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  };

  function validate() {
    const next = {};
    if (!isName(form.name)) next.name = 'Enter your full name.';
    const phoneErr = mobileError(form.phone);
    if (phoneErr) next.phone = phoneErr;
    if (!isEmail(form.email)) next.email = 'Please enter a valid email address.';
    if (!form.interest) next.interest = 'Select an interest.';
    if (trimName(form.message).length < 10) next.message = 'Please tell us a little more (min 10 characters).';
    if (!form.consent) next.consent = 'Consent is required before we can contact you.';
    return next;
  }

  async function onSubmit(e) {
    e.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    setBusy(true);
    try {
      await api.enquiry({
        name: trimName(form.name),
        phone: normalizeMobile(form.phone),
        email: normalizeEmail(form.email),
        interest: [form.interest],
        message: trimName(form.message),
        website: '',
      });
      setForm({ name: '', phone: '', email: '', interest: '', message: '', consent: false });
      setErrors({});
      toast.success('Your enquiry has been sent successfully.');
    } catch (err) {
      toast.error(err.status === 0 ? "We couldn't send your enquiry right now. Please try again." : err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <section className="hero-stage">
        <div className="container hero-layout">
          <h1>
            Train. Play.
            <br />
            <em>Belong.</em>
          </h1>
          <div className="hero-side">
            <p className="lead">
              Live courts in Vadodara. Check availability, choose a membership, and book your next game in a few clicks.
            </p>
            <div className="hero-actions">
              <Link className="btn btn-primary" to="/availability">Check availability</Link>
              <Link className="btn btn-secondary" to="/membership">See memberships</Link>
            </div>
          </div>
        </div>
        <div className="container stat-row">
          <article className="stat">
            <strong>{loading ? '—' : sports.filter((s) => s.courtCount > 0).length || sports.length || '—'}</strong>
            <span>Sports on the floor</span>
          </article>
          <article className="stat">
            <strong>{loading ? '—' : sports.reduce((n, s) => n + (s.courtCount || 0), 0) || '—'}</strong>
            <span>Courts you can book</span>
          </article>
          <article className="stat">
            <strong>{loading ? '—' : plans.length || '—'}</strong>
            <span>Membership plans</span>
          </article>
        </div>
      </section>

      <section className="container block">
        <p className="eyebrow">The club</p>
        <h2 className="section-title">Courts built for the way you play.</h2>
        <p className="lead section-copy">
          Badminton, padel, tennis and cricket nets with live availability and flexible memberships for the hours you use.
        </p>
      </section>

      <section className="container block">
        <div className="section-head-row">
          <div>
            <p className="eyebrow">Sports</p>
            <h2 className="section-title">Pick a game. Find an open time.</h2>
          </div>
          <Link className="text-link" to="/sports">See all sports →</Link>
        </div>
        {error && <div className="msg msg-err" style={{ marginTop: 12 }}>{error}</div>}
        {loading && <SkeletonCards count={4} />}
        {!loading && (
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
        )}
        {!loading && !sports.length && !error && <div className="empty">Sports will appear here once they are active in admin.</div>}
      </section>

      <section className="container block">
        <div className="section-head-row">
          <div>
            <p className="eyebrow">Membership</p>
            <h2 className="section-title">Plans for the way you play.</h2>
          </div>
          <Link className="text-link" to="/membership">See all plans →</Link>
        </div>
        {loading && <SkeletonCards count={3} className="plan-grid" />}
        {!loading && (
        <div className="plan-grid">
          {plans.map((plan) => (
            <article className={`plan${plan.key === 'gold' ? ' popular' : ''}`} key={plan.id}>
              {plan.key === 'gold' && <span className="badge">Most Popular</span>}
              <span className="chip">{plan.key}</span>
              <h3>{plan.name}</h3>
              <p className="muted">{plan.description}</p>
              <div className="price">{formatPaise(planMonthlyPaise(plan))}<small> / month</small></div>
              <ul className="perk-list">
                {planPerks(plan).slice(0, 5).map((perk) => <li key={perk}>{perk}</li>)}
              </ul>
              <Link className="btn btn-primary" to={`/membership?plan=${encodeURIComponent(plan.id)}`}>Choose {plan.name}</Link>
            </article>
          ))}
        </div>
        )}
      </section>

      <div className="marquee" aria-hidden="true">
        <div>
          {(sports.length ? sports : [{ name: 'Badminton' }, { name: 'Padel' }, { name: 'Tennis' }, { name: 'Cricket nets' }])
            .concat(sports.length ? sports : [{ name: 'Badminton' }, { name: 'Padel' }, { name: 'Tennis' }, { name: 'Cricket nets' }])
            .map((sport, i) => (
              <span key={`${sport.name}-${i}`}>{sport.name}</span>
            ))}
        </div>
      </div>

      <section className="container block">
        <div className="trial-band">
          <div>
            <h2>Ready for a first session?</h2>
            <p className="lead">Book a trial and see the club before you choose a membership.</p>
          </div>
          <Link className="btn btn-primary" to="/trial">Book a trial</Link>
        </div>
      </section>

      <section className="container block">
        <p className="eyebrow">Contact</p>
        <h2 className="section-title">Questions about courts, memberships or events?</h2>
        <p className="lead section-copy">Our team is here to help with bookings, memberships and private events.</p>
        <div className="contact-layout contact-layout-home">
          <form className="card form-card" onSubmit={onSubmit} noValidate>
            <div className="form-grid">
              <Field label="Full Name" error={errors.name}>
                <input name="name" placeholder="Your full name" autoComplete="name" value={form.name} onChange={onChange} />
              </Field>
              <Field label="Phone" error={errors.phone}>
                <span className="phone-field">
                  <span>+91</span>
                  <input
                    name="phone"
                    inputMode="numeric"
                    placeholder="9876543210"
                    autoComplete="tel"
                    value={form.phone}
                    onChange={(e) => {
                      const digits = normalizeMobile(e.target.value);
                      setForm({ ...form, phone: digits.slice(0, 10) });
                    }}
                  />
                </span>
              </Field>
              <Field label="Email" error={errors.email}>
                <input name="email" type="email" placeholder="you@email.com" autoComplete="email" value={form.email} onChange={onChange} />
              </Field>
              <Field label="Interest" error={errors.interest}>
                <select name="interest" value={form.interest} onChange={onChange}>
                  <option value="">Select an interest</option>
                  {INTERESTS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
                </select>
              </Field>
              <Field className="span-2" label="Message" error={errors.message}>
                <textarea name="message" placeholder="Tell us how we can help..." value={form.message} onChange={onChange} />
              </Field>
            </div>
            <label className="check">
              <input type="checkbox" name="consent" checked={form.consent} onChange={onChange} />
              <span>I consent to be contacted about this enquiry.</span>
            </label>
            {errors.consent && <small className="field-error">{errors.consent}</small>}
            <button className="btn btn-primary btn-block" type="submit" disabled={busy}>{busy ? 'Sending…' : 'Send Enquiry'}</button>
          </form>

          <aside className="card info-card">
            <h3>{club?.name || 'Aarambh Sports Arena'}</h3>
            <p>
              <strong>Location</strong>
              {address || 'Vadodara, Gujarat'}
            </p>
            {loc?.phone && (
              <p>
                <strong>Phone</strong>
                <a href={`tel:${loc.phone}`}>{loc.phone}</a>
              </p>
            )}
            <div className="info-actions">
              <Link className="btn btn-secondary" to="/availability">Check availability</Link>
              <Link className="btn btn-secondary" to="/trial">Book a trial</Link>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
