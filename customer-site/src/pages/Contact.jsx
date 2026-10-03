import { useEffect, useState } from 'react';
import { api } from '../api';

export default function Contact() {
  const [club, setClub] = useState(null);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    interest: 'membership',
    message: '',
    consent: false,
  });
  const [status, setStatus] = useState({ type: '', text: '' });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.club().then(setClub).catch(() => {});
  }, []);

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  };

  async function onSubmit(e) {
    e.preventDefault();
    if (!form.consent) {
      setStatus({ type: 'err', text: 'Please accept contact consent.' });
      return;
    }
    setBusy(true);
    setStatus({ type: '', text: '' });
    try {
      const data = await api.enquiry({
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        interest: [form.interest],
        message: form.message.trim(),
        website: '',
      });
      setStatus({
        type: 'ok',
        text: data?.leadNo
          ? `Enquiry ${data.leadNo} sent — the Aarambh team will reply shortly.`
          : 'Thanks — your enquiry is with the Aarambh team.',
      });
      setForm({ name: '', phone: '', email: '', interest: 'membership', message: '', consent: false });
    } catch (err) {
      setStatus({ type: 'err', text: err.message });
    } finally {
      setBusy(false);
    }
  }

  const loc = club?.location;

  return (
    <>
      <header className="page-hero">
        <h1>Contact</h1>
        <p>Membership, coaching, corporate play or a quick question — send a note to the club.</p>
      </header>
      <section className="section">
        <div className="split">
          <form className="form" onSubmit={onSubmit}>
            <label>
              Name
              <input name="name" required value={form.name} onChange={onChange} />
            </label>
            <label>
              Phone
              <input name="phone" required value={form.phone} onChange={onChange} />
            </label>
            <label>
              Email
              <input type="email" name="email" value={form.email} onChange={onChange} />
            </label>
            <label>
              Interest
              <select name="interest" value={form.interest} onChange={onChange}>
                <option value="membership">Membership</option>
                <option value="trial">Trial</option>
                <option value="coaching">Coaching</option>
                <option value="corporate">Corporate / events</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label>
              Message
              <textarea name="message" required value={form.message} onChange={onChange} />
            </label>
            <label className="check">
              <input type="checkbox" name="consent" checked={form.consent} onChange={onChange} />
              I consent to be contacted about this enquiry.
            </label>
            {status.text && (
              <div className={`msg ${status.type === 'ok' ? 'msg-ok' : 'msg-err'}`}>{status.text}</div>
            )}
            <button className="btn btn-primary" type="submit" disabled={busy}>
              {busy ? 'Sending…' : 'Send enquiry'}
            </button>
          </form>
          <aside className="info-card">
            <h3>{club?.name || 'Aarambh Sports Arena'}</h3>
            <p>{loc?.name || 'Main club'}</p>
            <p>{loc?.address || 'Vadodara, Gujarat'}</p>
            <p>{loc?.phone || '+91-9999999999'}</p>
            <p>{loc?.timezone || 'Asia/Kolkata'}</p>
          </aside>
        </div>
      </section>
    </>
  );
}
