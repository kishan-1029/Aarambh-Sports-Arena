'use client';

import { useState } from 'react';
import { postEnquiry } from '@/lib/api';

export default function EnquiryForm() {
  const [status, setStatus] = useState({ type: '', text: '' });
  const [pending, setPending] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setPending(true);
    setStatus({ type: '', text: '' });
    const fd = new FormData(e.currentTarget);
    const body = {
      name: String(fd.get('name') || '').trim(),
      phone: String(fd.get('phone') || '').trim(),
      email: String(fd.get('email') || '').trim(),
      interest: String(fd.get('interest') || '').trim(),
      message: String(fd.get('message') || '').trim(),
      website: String(fd.get('website') || ''),
    };

    try {
      const data = await postEnquiry(body);
      setStatus({
        type: 'ok',
        text: `${data.message || 'Thanks!'} Reference: ${data.leadNo}`,
      });
      e.currentTarget.reset();
    } catch (err) {
      setStatus({ type: 'err', text: err.message || 'Could not send enquiry' });
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="form-card form-stack" onSubmit={onSubmit}>
      <label>
        Name
        <input name="name" required maxLength={120} autoComplete="name" />
      </label>
      <label>
        Phone
        <input name="phone" required maxLength={32} autoComplete="tel" />
      </label>
      <label>
        Email
        <input name="email" type="email" maxLength={160} autoComplete="email" />
      </label>
      <label>
        Interest
        <select name="interest" defaultValue="membership">
          <option value="membership">Membership</option>
          <option value="court_hire">Court hire</option>
          <option value="coaching">Coaching</option>
          <option value="corporate">Corporate / events</option>
          <option value="other">Other</option>
        </select>
      </label>
      <label>
        Message
        <textarea name="message" maxLength={2000} placeholder="How can we help?" />
      </label>
      <label className="hp" aria-hidden>
        Website
        <input name="website" tabIndex={-1} autoComplete="off" />
      </label>
      {status.text ? (
        <p className={`form-msg ${status.type === 'ok' ? 'ok' : 'err'}`}>{status.text}</p>
      ) : null}
      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? 'Sending…' : 'Send enquiry'}
      </button>
    </form>
  );
}
