import { useEffect, useState } from 'react';
import { api, shiftDate, todayLocalIST } from '../api';
import { useToast } from '../toast';
import { isEmail, isName, mobileError, normalizeEmail, normalizeMobile, trimName } from '../validate';

const TIME_OPTIONS = [
  '6:00 am', '6:30 am', '7:00 am', '7:30 am', '8:00 am', '8:30 am',
  '9:00 am', '9:30 am', '10:00 am', '10:30 am', '11:00 am', '11:30 am',
  '12:00 pm', '12:30 pm', '1:00 pm', '1:30 pm', '2:00 pm', '2:30 pm',
  '3:00 pm', '3:30 pm', '4:00 pm', '4:30 pm', '5:00 pm', '5:30 pm',
  '6:00 pm', '6:30 pm', '7:00 pm', '7:30 pm', '8:00 pm', '8:30 pm',
  '9:00 pm', '9:30 pm'
];

function Field({ label, error, className = '', children }) {
  return (
    <label className={`field${className ? ` ${className}` : ''}${error ? ' invalid' : ''}`}>
      <span>{label}</span>
      {children}
      {error && <small className="field-error">{error}</small>}
    </label>
  );
}

export default function Trial() {
  const toast = useToast();
  const today = todayLocalIST();
  const maxDate = shiftDate(today, 30);
  const [sports, setSports] = useState([]);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    sportId: '',
    preferredDate: today,
    preferredTime: '',
    notes: '',
    consent: false,
  });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.sports()
      .then((d) => {
        const list = Array.isArray(d) ? d : [];
        setSports(list);
      })
      .catch(() => {});
  }, []);

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
    if (!form.sportId) next.sportId = 'Select a sport.';
    if (!form.preferredDate) next.preferredDate = 'Select your preferred date.';
    if (!form.preferredTime) next.preferredTime = 'Select your preferred time.';
    if (!form.consent) next.consent = 'Consent is required before we can contact you.';
    return next;
  }

  async function onSubmit(e) {
    e.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setBusy(true);
    const sportName = sports.find((s) => s.id === form.sportId)?.name || 'Sport';
    const message = `Trial request: ${sportName} on ${form.preferredDate} at ${form.preferredTime}.${form.notes ? ` Notes: ${trimName(form.notes)}` : ''}`;

    try {
      const data = await api.trial({
        name: trimName(form.name),
        phone: normalizeMobile(form.phone),
        email: normalizeEmail(form.email),
        message,
        localDate: form.preferredDate,
        sportId: form.sportId,
        interest: ['trial', sportName],
        website: '',
      });
      toast.success(
        data?.leadNo
          ? `Trial request ${data.leadNo} received. We will confirm your slot shortly.`
          : 'Trial request received. Our team will confirm your slot shortly.'
      );
      setForm({
        name: '',
        phone: '',
        email: '',
        sportId: '',
        preferredDate: today,
        preferredTime: '',
        notes: '',
        consent: false,
      });
      setErrors({});
    } catch (err) {
      toast.error(err.message || 'Failed to submit trial request.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="page container">
      <div className="form-page trial-page">
        <header className="page-hero">
          <h1>Book a Trial</h1>
          <p>Experience Aarambh Sports Arena before choosing your membership.</p>
        </header>

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

            <Field label="Sport" error={errors.sportId}>
              <select name="sportId" value={form.sportId} onChange={onChange}>
                <option value="">Select a sport</option>
                {sports.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Preferred Date" error={errors.preferredDate}>
              <input
                type="date"
                name="preferredDate"
                min={today}
                max={maxDate}
                value={form.preferredDate}
                onChange={onChange}
              />
            </Field>

            <Field label="Preferred Time" error={errors.preferredTime}>
              <select name="preferredTime" value={form.preferredTime} onChange={onChange}>
                <option value="">Select a time</option>
                {TIME_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </Field>

            <Field className="span-2" label="Notes" error={errors.notes}>
              <input
                name="notes"
                placeholder="Skill level or anything we should know"
                value={form.notes}
                onChange={onChange}
              />
            </Field>
          </div>

          <label className="check">
            <input type="checkbox" name="consent" checked={form.consent} onChange={onChange} />
            <span>I consent to be contacted about this trial booking.</span>
          </label>
          {errors.consent && <small className="field-error">{errors.consent}</small>}

          <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
            {busy ? 'Booking…' : 'Book Trial'}
          </button>
        </form>

        <section className="next-steps">
          <h2>What happens next</h2>
          <div className="step-row">
            <article>
              <span>1</span>
              <p>We receive your request</p>
            </article>
            <article>
              <span>2</span>
              <p>Our team confirms an available slot</p>
            </article>
            <article>
              <span>3</span>
              <p>You receive confirmation</p>
            </article>
          </div>
        </section>
      </div>
    </section>
  );
}
