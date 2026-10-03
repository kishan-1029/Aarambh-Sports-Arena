import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, formatPaise, planMonthlyPaise } from '../api';
import { useAuth } from '../auth';
import { useAuthDialog } from '../authDialog';
import { useToast } from '../toast';

const FALLBACK_METHODS = [
  { id: 'upi', label: 'UPI', hint: 'Google Pay / PhonePe / UPI apps' },
  { id: 'card', label: 'Card', hint: 'Debit or credit card' },
  { id: 'netbanking', label: 'Net banking', hint: 'Pay using your bank' },
];

function perks(plan) {
  return [
    ...(plan.entitlements?.perks || []),
    plan.entitlements?.court?.maxBookingsPerDay ? `Up to ${plan.entitlements.court.maxBookingsPerDay} bookings a day` : null,
    plan.entitlements?.court?.advanceBookingDays ? `Book ${plan.entitlements.court.advanceBookingDays} days ahead` : null,
    plan.entitlements?.shopDiscountPct ? `${plan.entitlements.shopDiscountPct}% shop discount` : null,
    plan.entitlements?.barDiscountPct ? `${plan.entitlements.barDiscountPct}% café discount` : null,
    plan.entitlements?.guestPasses ? `${plan.entitlements.guestPasses} guest passes` : null,
  ].filter(Boolean);
}

function formatUntil(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
}

export default function Membership({ embedded = false }) {
  const { user, setUser, ready } = useAuth();
  const { openAuth } = useAuthDialog();
  const toast = useToast();
  const [params] = useSearchParams();
  const [plans, setPlans] = useState([]);
  const [methods, setMethods] = useState(FALLBACK_METHODS);
  const [method, setMethod] = useState('');
  const [months, setMonths] = useState(1);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [pendingPlan, setPendingPlan] = useState(params.get('plan') || '');
  const [checkout, setCheckout] = useState(null);
  const [activated, setActivated] = useState(false);
  const opened = useRef(false);

  useEffect(() => {
    api.plans()
      .then((rows) => setPlans(Array.isArray(rows) ? rows : []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
    api.cancellationPolicy()
      .then((policy) => {
        if (policy?.paymentMethods?.length) setMethods(policy.paymentMethods);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const id = params.get('plan');
    if (!ready || !id || !plans.length || opened.current) return;
    const plan = plans.find((item) => item.id === id);
    if (!plan) return;
    opened.current = true;
    if (user?.premium) return;
    const start = () => {
      setMonths(plan.durations?.[0]?.months || 1);
      setMethod('');
      setActivated(false);
      setCheckout(plan);
    };
    if (!user) {
      setPendingPlan(plan.id);
      openAuth({ mode: 'login', onSuccess: start });
      return;
    }
    start();
  }, [ready, user, plans, params, openAuth]);

  const openCheckout = (plan) => {
    const start = () => {
      setError('');
      setActivated(false);
      setMethod('');
      setMonths(plan.durations?.[0]?.months || 1);
      setCheckout(plan);
    };
    if (!user) {
      setPendingPlan(plan.id);
      openAuth({ mode: 'login', onSuccess: start });
      return;
    }
    if (user.premium && user.tierKey === plan.key) return;
    if (user.premium) return;
    start();
  };

  const confirm = async () => {
    if (!checkout || !method || busy) return;
    setBusy(true);
    setError('');
    try {
      const data = await api.buyMembership({ planId: checkout.id, months: Number(months), paymentMethod: method });
      setUser(data.profile);
      setActivated(true);
      setNotice(`${checkout.name} is active.`);
      toast.success(`${checkout.name} membership activated successfully!`);
    } catch (err) {
      setError(err.message);
      toast.error(err.message || 'Failed to activate membership.');
    } finally {
      setBusy(false);
    }
  };

  const current = plans.find((plan) => user?.premium && plan.key === user.tierKey);
  const selectedDuration = checkout?.durations?.find((d) => Number(d.months) === Number(months)) || checkout?.durations?.[0];

  const body = (
    <>
      {!embedded && (
        <header className="page-hero">
          <h1>Membership</h1>
          <p>Find the membership that fits your game.</p>
        </header>
      )}
      {loading && <div className="skeleton" style={{ height: 120, marginBottom: 24 }} />}
      {notice && !checkout && <div className="msg msg-ok" style={{ marginBottom: 24 }}>{notice}</div>}
      {error && !checkout && <div className="msg msg-err" style={{ marginBottom: 24 }}>{error}</div>}

      {user?.premium ? (
        <article className="card" style={{ marginBottom: 32, borderColor: 'var(--green)', background: 'var(--soft)', padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 12 }}>
            <span className="chip" style={{ background: 'var(--glass-strong)' }}>YOUR MEMBERSHIP</span>
            <span className="badge" style={{ background: 'var(--sel-bg)', color: 'var(--sel-ink)' }}>ACTIVE</span>
          </div>
          <h2 style={{ margin: '0 0 6px 0', fontSize: 24, fontWeight: 700 }}>{((current?.name || user.tierKey || 'Membership') + ' MEMBER').toUpperCase()}</h2>
          <p className="muted" style={{ marginBottom: 16 }}>Valid until <strong>{formatUntil(user.membershipEndDate)}</strong></p>
          {current && (
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: 'var(--ink)' }}>Included Benefits</p>
              <ul className="perk-list" style={{ margin: 0 }}>
                {perks(current).slice(0, 6).map((perk) => <li key={perk}>{perk}</li>)}
              </ul>
            </div>
          )}
        </article>
      ) : embedded ? (
        <article className="card" style={{ marginBottom: 32, textAlign: 'center', padding: '32px 24px' }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: 18, fontWeight: 600 }}>You don't have an active membership</h3>
          <p className="muted" style={{ margin: 0 }}>Explore our available plans below to unlock court discounts, advance bookings, and member perks.</p>
        </article>
      ) : null}

      <h2 className="section-title section-title-sm">{user?.premium ? 'Explore Other Plans' : 'Membership Plans'}</h2>
      <div className="plan-grid">
        {plans.map((plan) => {
          const isCurrent = Boolean(user?.premium && user.tierKey === plan.key);
          return (
            <article className={`plan${plan.key === 'gold' ? ' popular' : ''}`} key={plan.id}>
              {plan.key === 'gold' && <span className="badge">Most Popular</span>}
              <span className="chip">{plan.key}</span>
              <h3>{plan.name}</h3>
              <p className="muted">{plan.description || 'Club membership'}</p>
              <div className="price">{formatPaise(planMonthlyPaise(plan))}<small> / month</small></div>
              <ul className="perk-list">{perks(plan).slice(0, 6).map((perk) => <li key={perk}>{perk}</li>)}</ul>
              {isCurrent ? (
                <button className="btn btn-secondary" type="button" disabled>Current Plan</button>
              ) : user?.premium ? (
                <p className="muted" style={{ marginTop: 'auto', paddingTop: 12, fontSize: 13, textAlign: 'center' }}>Available after your current plan ends.</p>
              ) : (
                <button className="btn btn-primary" type="button" onClick={() => openCheckout(plan)}>
                  Choose {plan.name}
                </button>
              )}
            </article>
          );
        })}
      </div>
      {!loading && !error && plans.length === 0 && <div className="empty">Plans will appear here once they are published in admin.</div>}

      {checkout && (
        <div className="modal-back" role="presentation" onClick={() => !busy && setCheckout(null)}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="plan-title" onClick={(e) => e.stopPropagation()}>
            {activated ? (
              <>
                <h2 id="plan-title">Membership Activated ✓</h2>
                <p>{checkout.name} is now active on your profile.</p>
                <div className="modal-actions">
                  <button className="btn btn-primary" type="button" onClick={() => setCheckout(null)}>Done</button>
                </div>
              </>
            ) : (
              <>
                <h2 id="plan-title">Confirm Membership</h2>
                <p className="lead" style={{ margin: '4px 0 16px 0', fontSize: 16 }}>{checkout.name}</p>
                <div className="review-lines">
                  <div><span>Plan Price</span><strong>{formatPaise(selectedDuration?.pricePaise ?? planMonthlyPaise(checkout))}</strong></div>
                </div>
                {(checkout.durations || []).length > 0 && (
                  <label className="field" style={{ marginTop: 16 }}>
                    <span>Duration</span>
                    <select value={months} onChange={(e) => setMonths(Number(e.target.value))}>
                      {checkout.durations.map((d) => (
                        <option key={d.months} value={d.months}>{`${d.months} ${d.months === 1 ? 'month' : 'months'} · ${formatPaise(d.pricePaise)}`}</option>
                      ))}
                    </select>
                  </label>
                )}
                <ul className="perk-list" style={{ margin: '16px 0' }}>{perks(checkout).slice(0, 4).map((perk) => <li key={perk}>{perk}</li>)}</ul>
                <h3 style={{ margin: '16px 0 8px 0', fontSize: 15, fontWeight: 600 }}>Payment Method</h3>
                <div className="method-row">
                  {methods.map((item) => (
                    <button key={item.id} type="button" className={method === item.id ? 'pay-option on' : 'pay-option'} onClick={() => setMethod(item.id)}>
                      <strong>{item.label}</strong>
                      <span>{item.hint || ''}</span>
                    </button>
                  ))}
                </div>
                {error && <div className="msg msg-err" style={{ marginTop: 12 }}>{error}</div>}
                <div className="modal-actions" style={{ marginTop: 24 }}>
                  <button className="btn btn-secondary" type="button" disabled={busy} onClick={() => setCheckout(null)}>Cancel</button>
                  <button className="btn btn-primary" type="button" disabled={!method || busy} onClick={confirm}>
                    {busy ? 'Confirming…' : 'Confirm Membership'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );

  return embedded ? body : <section className="page container">{body}</section>;
}
