import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useToast } from '../toast';
import { isEmail, isName, mobileError, normalizeEmail, normalizeMobile, trimName } from '../validate';

const INTERESTS = [
  { id: 'membership', label: 'Membership' },
  { id: 'trial', label: 'Trial' },
  { id: 'coaching', label: 'Coaching' },
  { id: 'corporate', label: 'Corporate / Events' },
  { id: 'other', label: 'Other' },
];

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

export default function Contact() {
  const toast = useToast();
  const [club, setClub] = useState(null);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    interest: '',
    message: '',
    consent: false,
  });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.club().then(setClub).catch(() => {});
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
      const data = await api.enquiry({
        name: trimName(form.name),
        phone: normalizeMobile(form.phone),
        email: normalizeEmail(form.email),
        interest: [form.interest],
        message: trimName(form.message),
        website: '',
      });
      setForm({ name: '', phone: '', email: '', interest: '', message: '', consent: false });
      setErrors({});
      toast.success(
        data?.leadNo
          ? `Enquiry ${data.leadNo} sent — our team will reply shortly!`
          : 'Thank you — your enquiry has been sent successfully!'
      );
    } catch (err) {
      toast.error(err.message || "Couldn't send enquiry. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="page container">
      <header className="page-hero">
        <h1>Contact Us</h1>
        <p>Have a question about memberships, courts or club events? Send us a message.</p>
      </header>

      <div className="contact-layout">
        <form className="card form-card" onSubmit={onSubmit} noValidate>
          <div className="form-grid">
            <Field label="Full Name" error={errors.name}>
              <input
                name="name"
                placeholder="Your full name"
                autoComplete="name"
                value={form.name}
                onChange={onChange}
              />
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
              <input
                name="email"
                type="email"
                placeholder="you@email.com"
                autoComplete="email"
                value={form.email}
                onChange={onChange}
              />
            </Field>

            <Field label="Interest" error={errors.interest}>
              <select name="interest" value={form.interest} onChange={onChange}>
                <option value="">Select an interest</option>
                {INTERESTS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field className="span-2" label="Message" error={errors.message}>
              <textarea
                name="message"
                placeholder="Tell us how we can help..."
                value={form.message}
                onChange={onChange}
              />
            </Field>
          </div>

          <label className="check">
            <input type="checkbox" name="consent" checked={form.consent} onChange={onChange} />
            <span>I consent to be contacted about this enquiry.</span>
          </label>
          {errors.consent && <small className="field-error">{errors.consent}</small>}

          <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
            {busy ? 'Sending…' : 'Send Enquiry'}
          </button>
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
  );
}
