import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { formatPaise } from '../api.js';
import { useAuth } from '../auth.jsx';
import { useAuthDialog } from '../authDialog.jsx';
import { useCart } from '../cart.jsx';
import { useToast } from '../toast.jsx';
import Skeleton from '../components/Skeleton.jsx';
import { ProductThumb } from '../components/ProductCard.jsx';

export default function Cart() {
  const { cart, loading, updateItem, removeItem } = useCart();
  const { user, ready } = useAuth();
  const { openAuth } = useAuthDialog();
  const toast = useToast();
  const navigate = useNavigate();
  const [busyId, setBusyId] = useState(null);

  const run = async (itemId, fn, successMessage) => {
    setBusyId(itemId);
    try {
      await fn();
      if (successMessage) toast.success(successMessage);
    } catch (err) {
      toast.error(err.message || 'Could not update your cart');
    } finally {
      setBusyId(null);
    }
  };

  const onCheckout = () => {
    if (!user) {
      openAuth({ mode: 'login' });
      return;
    }
    navigate('/checkout');
  };

  const blocking = cart.items.some((i) => i.issue);

  // Until the session resolves we do not know whose cart this is, so hold the
  // empty state back rather than flashing it at a shopper who has items.
  if (!ready || loading) {
    return (
      <section className="page container">
        <header className="page-hero">
          <h1>Your cart</h1>
        </header>
        <Skeleton rows={6} />
      </section>
    );
  }

  if (cart.items.length === 0) {
    return (
      <section className="page container">
        <header className="page-hero">
          <h1>Your cart</h1>
        </header>
        <div className="empty">
          Your cart is empty.
          <div style={{ marginTop: 16 }}>
            <Link className="btn btn-primary" to="/shop">
              Browse the Pro Shop
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="page container">
      <header className="page-hero">
        <h1>Your cart</h1>
        <p>
          {cart.itemCount} {cart.itemCount === 1 ? 'item' : 'items'} ready to collect or deliver.
        </p>
      </header>

      {cart.issues.length > 0 && (
        <div className="msg msg-err" style={{ marginBottom: 18 }}>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {cart.issues.map((issue) => (
              <li key={`${issue.itemId}-${issue.code}`}>{issue.message}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="cart-layout">
        <div className="cart-lines">
          {cart.items.map((item) => (
            <article className="card cart-line" key={item.id}>
              <Link to={`/shop/${item.slug}`} className="cart-line-media" aria-hidden="true" tabIndex={-1}>
                <ProductThumb product={item} className="cart-thumb" />
              </Link>

              <div className="cart-line-info">
                <h3>
                  <Link to={`/shop/${item.slug}`}>{item.name}</Link>
                </h3>
                <p className="muted">
                  {[item.variantName, item.sku].filter(Boolean).join(' · ')}
                </p>
                {item.memberDiscountPct > 0 && (
                  <p className="cart-line-member">
                    {item.memberDiscountPct}% member discount applied
                  </p>
                )}
                {item.issue && <p className="cart-line-issue">{item.issue.message}</p>}
              </div>

              <div className="cart-line-qty">
                <div className="qty-stepper">
                  <button
                    type="button"
                    aria-label={`Decrease quantity of ${item.name}`}
                    disabled={busyId === item.id || item.quantity <= 1}
                    onClick={() => run(item.id, () => updateItem(item.id, item.quantity - 1), 'Cart updated')}
                  >
                    −
                  </button>
                  <span>{item.quantity}</span>
                  <button
                    type="button"
                    aria-label={`Increase quantity of ${item.name}`}
                    disabled={busyId === item.id || item.quantity >= (item.maxQuantity ?? 20)}
                    onClick={() => run(item.id, () => updateItem(item.id, item.quantity + 1), 'Cart updated')}
                  >
                    +
                  </button>
                </div>
                <button
                  type="button"
                  className="text-link cart-remove"
                  disabled={busyId === item.id}
                  onClick={() => run(item.id, () => removeItem(item.id), 'Product removed')}
                >
                  Remove
                </button>
              </div>

              <div className="cart-line-money">
                <strong>{formatPaise(item.lineSubtotalPaise - item.discountPaise)}</strong>
                {item.discountPaise > 0 && <s>{formatPaise(item.lineSubtotalPaise)}</s>}
                <span className="muted">{formatPaise(item.unitPricePaise)} each</span>
              </div>
            </article>
          ))}
        </div>

        <aside className="card cart-summary">
          <h2 className="section-title-sm">Order summary</h2>
          <div className="sum-rows">
            <div className="sum-row">
              <span>Subtotal</span>
              <span>{formatPaise(cart.totals.subtotalPaise)}</span>
            </div>
            {cart.totals.discountPaise > 0 && (
              <div className="sum-row sum-save">
                <span>Member discount ({cart.memberDiscountPct}%)</span>
                <span>−{formatPaise(cart.totals.discountPaise)}</span>
              </div>
            )}
            {cart.totals.taxPaise > 0 && (
              <div className="sum-row">
                <span>Tax</span>
                <span>{formatPaise(cart.totals.taxPaise)}</span>
              </div>
            )}
            <div className="sum-row sum-total">
              <span>Total</span>
              <span>{formatPaise(cart.totals.grandTotalPaise)}</span>
            </div>
          </div>

          <p className="muted cart-note">
            Delivery charges, if any, are added at checkout once you choose how to receive your order.
          </p>

          <button
            type="button"
            className="btn btn-primary btn-block"
            disabled={blocking || loading}
            onClick={onCheckout}
          >
            {user ? 'Proceed to checkout' : 'Sign in to checkout'}
          </button>
          <Link className="btn btn-secondary btn-block" to="/shop" style={{ marginTop: 10 }}>
            Continue shopping
          </Link>

          {!user && (
            <p className="muted cart-note">
              Your cart is saved to this device and moves with you when you sign in.
            </p>
          )}
        </aside>
      </div>
    </section>
  );
}
