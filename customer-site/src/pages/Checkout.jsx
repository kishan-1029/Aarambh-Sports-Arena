import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, formatPaise } from '../api.js';
import { useAuth } from '../auth.jsx';
import { useCart } from '../cart.jsx';
import { useToast } from '../toast.jsx';
import Skeleton from '../components/Skeleton.jsx';

const PAYMENT_LABEL = {
  pay_at_club: 'Pay at the club',
  cash_on_delivery: 'Cash on delivery',
  online: 'Pay online',
  upi: 'UPI',
  card: 'Card',
};

const PAYMENT_HINT = {
  pay_at_club: 'Settle at the front desk when you collect your order.',
  cash_on_delivery: 'Pay our rider in cash when your order arrives.',
  online: 'You will be redirected to our payment provider.',
  upi: 'Pay by UPI through our payment provider.',
  card: 'Pay by card through our payment provider.',
};

const EMPTY_ADDRESS = {
  fullName: '',
  phone: '',
  line1: '',
  line2: '',
  area: '',
  city: '',
  state: 'Gujarat',
  postalCode: '',
  landmark: '',
};

export default function Checkout() {
  const { user, ready } = useAuth();
  const { cart, refresh } = useCart();
  const toast = useToast();
  const navigate = useNavigate();

  const [fulfillmentType, setFulfillmentType] = useState('pickup');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [customerNote, setCustomerNote] = useState('');
  const [contact, setContact] = useState({ name: '', phone: '', email: '' });
  const [address, setAddress] = useState(EMPTY_ADDRESS);

  useEffect(() => {
    if (!ready) return;
    if (!user) navigate('/shop', { replace: true });
  }, [ready, user, navigate]);

  useEffect(() => {
    if (!user) return;
    setContact((c) => ({
      name: c.name || user.name || '',
      phone: c.phone || user.phone || '',
      email: c.email || user.email || '',
    }));
    setAddress((a) => ({
      ...a,
      fullName: a.fullName || user.name || '',
      phone: a.phone || user.phone || '',
    }));
  }, [user]);

  const loadQuote = useCallback(() => {
    setLoading(true);
    setError('');
    api
      .checkoutQuote(fulfillmentType)
      .then((data) => {
        setQuote(data);
        setPaymentMethod((current) =>
          data.methods?.includes(current) ? current : data.methods?.[0] || '',
        );
      })
      .catch((err) => setError(err.message || "We couldn't price your order."))
      .finally(() => setLoading(false));
  }, [fulfillmentType]);

  useEffect(() => {
    if (user) loadQuote();
  }, [user, loadQuote]);

  const validate = () => {
    const errs = {};
    if (!contact.name.trim()) errs.name = 'Please tell us who the order is for';
    if (!/^\d{10}$/.test(contact.phone.trim())) errs.phone = 'Enter a 10-digit mobile number';
    if (fulfillmentType === 'delivery') {
      if (!address.fullName.trim()) errs.addrName = 'Required';
      if (!/^\d{10}$/.test(address.phone.trim())) errs.addrPhone = 'Enter a 10-digit mobile number';
      if (!address.line1.trim()) errs.line1 = 'Required';
      if (!address.city.trim()) errs.city = 'Required';
      if (!address.state.trim()) errs.state = 'Required';
      if (!/^\d{6}$/.test(address.postalCode.trim())) errs.postalCode = 'Enter a 6-digit PIN code';
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const placeOrder = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    if (!paymentMethod) {
      setError('Please choose a payment method');
      return;
    }

    setPlacing(true);
    setError('');
    try {
      const order = await api.checkout({
        fulfillmentType,
        paymentMethod,
        deliveryAddress: fulfillmentType === 'delivery' ? address : null,
        customerNote: customerNote.trim() || undefined,
        contact: {
          name: contact.name.trim(),
          phone: contact.phone.trim(),
          email: contact.email.trim() || undefined,
        },
      });
      await refresh();
      toast.success('Order placed');
      navigate(`/orders/${order.orderNumber}?placed=1`, { replace: true });
    } catch (err) {
      setError(err.message || 'We could not place your order. Please try again.');
      await refresh();
      loadQuote();
    } finally {
      setPlacing(false);
    }
  };

  if (!ready || (loading && !quote)) {
    return (
      <section className="page container">
        <header className="page-hero">
          <h1>Checkout</h1>
        </header>
        <Skeleton rows={8} />
      </section>
    );
  }

  if (quote && quote.items.length === 0) {
    return (
      <section className="page container">
        <header className="page-hero">
          <h1>Checkout</h1>
        </header>
        <div className="empty">
          There is nothing in your cart to check out.
          <div style={{ marginTop: 16 }}>
            <Link className="btn btn-primary" to="/shop">
              Browse the Pro Shop
            </Link>
          </div>
        </div>
      </section>
    );
  }

  const totals = quote?.totals || {};
  const freeDeliveryGap =
    fulfillmentType === 'delivery' &&
    quote?.freeDeliveryAbovePaise > 0 &&
    totals.netPaise < quote.freeDeliveryAbovePaise
      ? quote.freeDeliveryAbovePaise - totals.netPaise
      : 0;

  return (
    <section className="page container">
      <header className="page-hero">
        <h1>Checkout</h1>
        <p>Confirm how you would like to receive your order and we will do the rest.</p>
      </header>

      {error && <div className="msg msg-err" style={{ marginBottom: 18 }}>{error}</div>}

      <form className="checkout-layout" onSubmit={placeOrder} noValidate>
        <div className="stack">
          <div className="card">
            <h2 className="section-title-sm">How would you like to receive it?</h2>
            <div className="choice-row">
              <button
                type="button"
                className={`choice ${fulfillmentType === 'pickup' ? 'on' : ''}`}
                onClick={() => setFulfillmentType('pickup')}
              >
                <strong>Collect at the club</strong>
                <span>{quote?.pickupLocation || 'Aarambh Sports Arena, Vadodara'}</span>
                <span className="choice-price">Free</span>
              </button>
              <button
                type="button"
                className={`choice ${fulfillmentType === 'delivery' ? 'on' : ''}`}
                onClick={() => setFulfillmentType('delivery')}
              >
                <strong>Deliver to me</strong>
                <span>Delivered to your address</span>
                <span className="choice-price">
                  {quote?.deliveryChargePaise
                    ? `${formatPaise(quote.deliveryChargePaise)}`
                    : 'Free'}
                </span>
              </button>
            </div>
            {freeDeliveryGap > 0 && (
              <p className="muted" style={{ marginTop: 12 }}>
                Add {formatPaise(freeDeliveryGap)} more to qualify for free delivery.
              </p>
            )}
          </div>

          <div className="card">
            <h2 className="section-title-sm">Contact details</h2>
            <div className="form-grid">
              <label className={`field ${fieldErrors.name ? 'invalid' : ''}`}>
                <span>Full name</span>
                <input
                  value={contact.name}
                  onChange={(e) => setContact({ ...contact, name: e.target.value })}
                  autoComplete="name"
                />
                {fieldErrors.name && <small className="field-error">{fieldErrors.name}</small>}
              </label>
              <label className={`field ${fieldErrors.phone ? 'invalid' : ''}`}>
                <span>Mobile number</span>
                <input
                  value={contact.phone}
                  inputMode="numeric"
                  maxLength={10}
                  onChange={(e) =>
                    setContact({ ...contact, phone: e.target.value.replace(/\D/g, '') })
                  }
                  autoComplete="tel-national"
                />
                {fieldErrors.phone && <small className="field-error">{fieldErrors.phone}</small>}
              </label>
              <label className="field span-2">
                <span>Email (optional)</span>
                <input
                  type="email"
                  value={contact.email}
                  onChange={(e) => setContact({ ...contact, email: e.target.value })}
                  autoComplete="email"
                />
              </label>
            </div>
          </div>

          {fulfillmentType === 'delivery' && (
            <div className="card">
              <h2 className="section-title-sm">Delivery address</h2>
              <div className="form-grid">
                <label className={`field ${fieldErrors.addrName ? 'invalid' : ''}`}>
                  <span>Recipient name</span>
                  <input
                    value={address.fullName}
                    onChange={(e) => setAddress({ ...address, fullName: e.target.value })}
                  />
                  {fieldErrors.addrName && <small className="field-error">{fieldErrors.addrName}</small>}
                </label>
                <label className={`field ${fieldErrors.addrPhone ? 'invalid' : ''}`}>
                  <span>Mobile number</span>
                  <input
                    value={address.phone}
                    inputMode="numeric"
                    maxLength={10}
                    onChange={(e) =>
                      setAddress({ ...address, phone: e.target.value.replace(/\D/g, '') })
                    }
                  />
                  {fieldErrors.addrPhone && <small className="field-error">{fieldErrors.addrPhone}</small>}
                </label>
                <label className={`field span-2 ${fieldErrors.line1 ? 'invalid' : ''}`}>
                  <span>Flat, house no., building</span>
                  <input
                    value={address.line1}
                    onChange={(e) => setAddress({ ...address, line1: e.target.value })}
                    autoComplete="address-line1"
                  />
                  {fieldErrors.line1 && <small className="field-error">{fieldErrors.line1}</small>}
                </label>
                <label className="field span-2">
                  <span>Street, locality (optional)</span>
                  <input
                    value={address.line2}
                    onChange={(e) => setAddress({ ...address, line2: e.target.value })}
                    autoComplete="address-line2"
                  />
                </label>
                <label className="field">
                  <span>Area (optional)</span>
                  <input
                    value={address.area}
                    onChange={(e) => setAddress({ ...address, area: e.target.value })}
                  />
                </label>
                <label className={`field ${fieldErrors.city ? 'invalid' : ''}`}>
                  <span>City</span>
                  <input
                    value={address.city}
                    onChange={(e) => setAddress({ ...address, city: e.target.value })}
                    autoComplete="address-level2"
                  />
                  {fieldErrors.city && <small className="field-error">{fieldErrors.city}</small>}
                </label>
                <label className={`field ${fieldErrors.state ? 'invalid' : ''}`}>
                  <span>State</span>
                  <input
                    value={address.state}
                    onChange={(e) => setAddress({ ...address, state: e.target.value })}
                    autoComplete="address-level1"
                  />
                  {fieldErrors.state && <small className="field-error">{fieldErrors.state}</small>}
                </label>
                <label className={`field ${fieldErrors.postalCode ? 'invalid' : ''}`}>
                  <span>PIN code</span>
                  <input
                    value={address.postalCode}
                    inputMode="numeric"
                    maxLength={6}
                    onChange={(e) =>
                      setAddress({ ...address, postalCode: e.target.value.replace(/\D/g, '') })
                    }
                    autoComplete="postal-code"
                  />
                  {fieldErrors.postalCode && (
                    <small className="field-error">{fieldErrors.postalCode}</small>
                  )}
                </label>
                <label className="field span-2">
                  <span>Landmark (optional)</span>
                  <input
                    value={address.landmark}
                    onChange={(e) => setAddress({ ...address, landmark: e.target.value })}
                  />
                </label>
              </div>
            </div>
          )}

          <div className="card">
            <h2 className="section-title-sm">Payment</h2>
            {!quote?.gatewayLive && (
              <p className="muted" style={{ marginBottom: 12 }}>
                Online payments are not switched on yet. You can pay when you collect or receive
                your order.
              </p>
            )}
            <div className="choice-row choice-row-stack">
              {(quote?.methods || []).map((method) => (
                <button
                  key={method}
                  type="button"
                  className={`choice ${paymentMethod === method ? 'on' : ''}`}
                  onClick={() => setPaymentMethod(method)}
                >
                  <strong>{PAYMENT_LABEL[method] || method}</strong>
                  <span>{PAYMENT_HINT[method] || ''}</span>
                </button>
              ))}
            </div>

            <label className="field" style={{ marginTop: 18 }}>
              <span>Note for the team (optional)</span>
              <textarea
                value={customerNote}
                maxLength={1000}
                placeholder="Anything we should know about this order?"
                onChange={(e) => setCustomerNote(e.target.value)}
              />
            </label>
          </div>
        </div>

        <aside className="card cart-summary">
          <h2 className="section-title-sm">Your order</h2>
          <ul className="quote-items">
            {(quote?.items || []).map((item) => (
              <li key={`${item.productId}-${item.variantId || ''}`}>
                <span>
                  {item.name}
                  {item.variantName ? ` · ${item.variantName}` : ''}
                  <small> × {item.quantity}</small>
                </span>
                <span>{formatPaise(item.unitPricePaise * item.quantity)}</span>
              </li>
            ))}
          </ul>

          <div className="sum-rows">
            <div className="sum-row">
              <span>Subtotal</span>
              <span>{formatPaise(totals.subtotalPaise || 0)}</span>
            </div>
            {totals.discountPaise > 0 && (
              <div className="sum-row sum-save">
                <span>Member discount ({quote.memberDiscountPct}%)</span>
                <span>−{formatPaise(totals.discountPaise)}</span>
              </div>
            )}
            {totals.taxPaise > 0 && (
              <div className="sum-row">
                <span>Tax</span>
                <span>{formatPaise(totals.taxPaise)}</span>
              </div>
            )}
            <div className="sum-row">
              <span>{fulfillmentType === 'delivery' ? 'Delivery' : 'Club pickup'}</span>
              <span>
                {totals.deliveryChargePaise > 0 ? formatPaise(totals.deliveryChargePaise) : 'Free'}
              </span>
            </div>
            <div className="sum-row sum-total">
              <span>Total payable</span>
              <span>{formatPaise(totals.grandTotalPaise || 0)}</span>
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={placing || loading}>
            {placing ? 'Placing order…' : 'Place order'}
          </button>
          <Link className="btn btn-secondary btn-block" to="/cart" style={{ marginTop: 10 }}>
            Back to cart
          </Link>
          <p className="muted cart-note">
            Every price here is calculated by Aarambh Sports Arena at the moment you order.
          </p>
        </aside>
      </form>
    </section>
  );
}
