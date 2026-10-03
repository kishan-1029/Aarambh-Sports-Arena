import { useEffect, useState } from 'react';
import { api, todayLocalIST } from '../api';

export default function Trial() {
  const [sports, setSports] = useState([]);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    sportId: '',
    preferredDate: todayLocalIST(),
    message: '',
    consent: false,
  });
  const [status, setStatus] = useState({ type: '', text: '' });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .sports()
      .then((d) => {
        const list = Array.isArray(d) ? d : [];
        setSports(list);
        if (list[0]?.id) setForm((f) => ({ ...f, sportId: f.sportId || list[0].id }));
      })
      .catch(() => {});
  }, []);

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  };

  async function onSubmit(e) {
    e.preventDefault();
    if (!form.consent) {
      setStatus({ type: 'err', text: 'Please accept contact consent to continue.' });
      return;
    }
    if (String(form.phone).replace(/\D/g, '').length < 7) {
      setStatus({ type: 'err', text: 'Enter a valid phone number.' });
      return;
    }
    setBusy(true);
    setStatus({ type: '', text: '' });
    const sportName = sports.find((s) => s.id === form.sportId)?.name || 'trial';
    try {
      const data = await api.trial({
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        message: form.message.trim() || `${sportName} trial request`,
        localDate: form.preferredDate || undefined,
        sportId: form.sportId || undefined,
        interest: ['trial', sportName],
        website: '',
      });
      setStatus({
        type: 'ok',
        text: data?.leadNo
          ? `Trial request ${data.leadNo} received. We will confirm your slot shortly.`
          : 'Trial request received. Our team will confirm your slot shortly.',
      });
      setForm((f) => ({
        ...f,
        name: '',
        phone: '',
        email: '',
        message: '',
        consent: false,
      }));
    } catch (err) {
      setStatus({ type: 'err', text: err.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <header className="page-hero">
        <h1>Book a trial</h1>
        <p>Four fields. We call or WhatsApp to lock a court. No payment required to request.</p>
      </header>
      <section className="section">
        <div className="split">
          <form className="form" onSubmit={onSubmit}>
            <label>
              Name
              <input name="name" required autoComplete="name" value={form.name} onChange={onChange} />
            </label>
            <label>
              Phone
              <input
                name="phone"
                required
                autoComplete="tel"
                placeholder="+91…"
                value={form.phone}
                onChange={onChange}
              />
            </label>
            <label>
              Email
              <input
                type="email"
                name="email"
                autoComplete="email"
                value={form.email}
                onChange={onChange}
              />
            </label>
            <label>
              Sport
              <select name="sportId" value={form.sportId} onChange={onChange}>
                {sports.length === 0 && <option value="">Any sport</option>}
                {sports.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Preferred date
              <input type="date" name="preferredDate" value={form.preferredDate} onChange={onChange} />
            </label>
            <label>
              Notes
              <textarea name="message" value={form.message} onChange={onChange} placeholder="Skill level, preferred time…" />
            </label>
            <label className="check">
              <input type="checkbox" name="consent" checked={form.consent} onChange={onChange} />
              I consent to be contacted about this trial booking.
            </label>
            {status.text && (
              <div className={`msg ${status.type === 'ok' ? 'msg-ok' : 'msg-err'}`}>{status.text}</div>
            )}
            <button className="btn btn-primary" type="submit" disabled={busy}>
              {busy ? 'Sending…' : 'Request trial'}
            </button>
          </form>
          <aside className="info-card">
            <h3>What happens next</h3>
            <p>1. Your lead hits the Aarambh front desk queue.</p>
            <p>2. We match an open slot on your preferred day.</p>
            <p>3. You get a confirmation call / WhatsApp.</p>
            <p style={{ marginTop: '1rem' }}>Tip: check Availability first so you know which evenings look open.</p>
          </aside>
        </div>
      </section>
    </>
  );
}
