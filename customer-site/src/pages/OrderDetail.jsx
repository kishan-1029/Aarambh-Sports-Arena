import { useCallback, useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { api, formatPaise } from '../api.js';
import { useAuth } from '../auth.jsx';
import { useToast } from '../toast.jsx';
import Skeleton from '../components/Skeleton.jsx';
import { ProductThumb } from '../components/ProductCard.jsx';
import { ORDER_STATUS_LABEL, PAYMENT_LABEL, PAYMENT_STATUS_LABEL, statusTone } from '../shopLabels.js';

export default function OrderDetail() {
  const { orderNumber } = useParams();
  const [params] = useSearchParams();
  const { user, ready } = useAuth();
  const toast = useToast();

  const justPlaced = params.get('placed') === '1';
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api
      .myOrder(orderNumber)
      .then(setOrder)
      .catch((err) => setError(err.status === 404 ? 'We could not find that order.' : err.message))
      .finally(() => setLoading(false));
  }, [orderNumber]);

  useEffect(() => {
    if (ready && user) load();
  }, [ready, user, load]);

  const onCancel = async () => {
    if (!window.confirm('Cancel this order? The items go back on the shelf.')) return;
    setCancelling(true);
    try {
      const updated = await api.cancelOrder(orderNumber);
      setOrder(updated);
      toast.success('Order cancelled');
    } catch (err) {
      toast.error(err.message || 'We could not cancel this order');
    } finally {
      setCancelling(false);
    }
  };

  if (!ready || loading) {
    return (
      <section className="page container">
        <Skeleton rows={8} />
      </section>
    );
  }

  if (!user) {
    return (
      <section className="page container">
        <div className="empty">Please sign in to view your order.</div>
      </section>
    );
  }

  if (error || !order) {
    return (
      <section className="page container">
        <div className="empty">
          {error || 'Order not found.'}
          <div style={{ marginTop: 16 }}>
            <Link className="btn btn-primary" to="/profile/orders">
              My orders
            </Link>
          </div>
        </div>
      </section>
    );
  }

  const addr = order.deliveryAddress;

  return (
    <section className="page container">
      {justPlaced && (
        <div className="order-success card">
          <div className="order-success-mark" aria-hidden="true">
            ✓
          </div>
          <div>
            <h1>Thank you — your order is in.</h1>
            <p className="muted">
              Your order number is <strong>{order.orderNumber}</strong>.
              {order.fulfillmentType === 'pickup'
                ? ' We will have it ready at the front desk and let you know when to collect.'
                : ' We will pack it and get it moving to your address.'}
            </p>
          </div>
        </div>
      )}

      <header className="page-hero order-head">
        <div>
          {!justPlaced && <span className="eyebrow">Order</span>}
          <h1>{order.orderNumber}</h1>
          <p className="muted">
            Placed {new Date(order.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
          </p>
        </div>
        <div className="order-head-badges">
          <span className={`badge ${statusTone(order.orderStatus)}`}>
            {ORDER_STATUS_LABEL[order.orderStatus] || order.orderStatus}
          </span>
          <span className="badge badge-neutral">
            {PAYMENT_STATUS_LABEL[order.paymentStatus] || order.paymentStatus}
          </span>
        </div>
      </header>

      <div className="order-layout">
        <div className="stack">
          <div className="card">
            <h2 className="section-title-sm">Items</h2>
            <div className="order-items">
              {order.items.map((item, index) => (
                <div className="order-item" key={`${item.productId}-${item.variantId || index}`}>
                  <ProductThumb product={item} className="cart-thumb" />
                  <div className="order-item-info">
                    <strong>
                      {item.slug ? <Link to={`/shop/${item.slug}`}>{item.name}</Link> : item.name}
                    </strong>
                    <span className="muted">
                      {[item.variantName, item.sku].filter(Boolean).join(' · ')}
                    </span>
                    <span className="muted">
                      {formatPaise(item.unitPricePaise)} × {item.quantity}
                    </span>
                  </div>
                  {/* Row shows the pre-tax amount so it ties back to Subtotal below. */}
                  <strong>{formatPaise(item.unitPricePaise * item.quantity)}</strong>
                </div>
              ))}
            </div>

            <div className="sum-rows order-totals">
              <div className="sum-row">
                <span>Subtotal</span>
                <span>{formatPaise(order.subtotalPaise)}</span>
              </div>
              {order.discountPaise > 0 && (
                <div className="sum-row sum-save">
                  <span>Member discount ({order.memberDiscountPct}%)</span>
                  <span>−{formatPaise(order.discountPaise)}</span>
                </div>
              )}
              {order.taxPaise > 0 && (
                <div className="sum-row">
                  <span>Tax</span>
                  <span>{formatPaise(order.taxPaise)}</span>
                </div>
              )}
              <div className="sum-row">
                <span>{order.fulfillmentType === 'delivery' ? 'Delivery' : 'Club pickup'}</span>
                <span>
                  {order.deliveryChargePaise > 0 ? formatPaise(order.deliveryChargePaise) : 'Free'}
                </span>
              </div>
              <div className="sum-row sum-total">
                <span>Total</span>
                <span>{formatPaise(order.grandTotalPaise)}</span>
              </div>
            </div>
          </div>

          {order.timeline.length > 0 && (
            <div className="card">
              <h2 className="section-title-sm">Progress</h2>
              <ol className="order-timeline">
                {order.timeline.map((step, index) => (
                  <li key={`${step.status}-${index}`}>
                    <span className="order-timeline-dot" aria-hidden="true" />
                    <div>
                      <strong>{ORDER_STATUS_LABEL[step.status] || step.status}</strong>
                      <span className="muted">
                        {new Date(step.at).toLocaleString('en-IN', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </span>
                      {step.note && step.note !== ORDER_STATUS_LABEL[step.status] && (
                        <p className="muted">{step.note}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>

        <aside className="stack">
          <div className="card">
            <h2 className="section-title-sm">
              {order.fulfillmentType === 'delivery' ? 'Delivering to' : 'Collect from'}
            </h2>
            {order.fulfillmentType === 'delivery' && addr ? (
              <address className="order-address">
                <strong>{addr.fullName}</strong>
                <span>{addr.line1}</span>
                {addr.line2 && <span>{addr.line2}</span>}
                {addr.area && <span>{addr.area}</span>}
                <span>
                  {addr.city}, {addr.state} {addr.postalCode}
                </span>
                {addr.landmark && <span className="muted">Landmark: {addr.landmark}</span>}
                <span className="muted">+91 {addr.phone}</span>
              </address>
            ) : (
              <address className="order-address">
                <strong>Aarambh Sports Arena</strong>
                <span>{order.pickupLocation || 'Vadodara, Gujarat'}</span>
                <span className="muted">Bring your order number to the front desk.</span>
              </address>
            )}
          </div>

          <div className="card">
            <h2 className="section-title-sm">Payment</h2>
            <div className="sum-rows">
              <div className="sum-row">
                <span>Method</span>
                <span>{PAYMENT_LABEL[order.paymentMethod] || order.paymentMethod}</span>
              </div>
              <div className="sum-row">
                <span>Status</span>
                <span>{PAYMENT_STATUS_LABEL[order.paymentStatus] || order.paymentStatus}</span>
              </div>
            </div>
          </div>

          {order.customerNote && (
            <div className="card">
              <h2 className="section-title-sm">Your note</h2>
              <p className="muted">{order.customerNote}</p>
            </div>
          )}

          {order.cancelReason && (
            <div className="card">
              <h2 className="section-title-sm">Cancellation</h2>
              <p className="muted">{order.cancelReason}</p>
            </div>
          )}

          <div className="card">
            <div className="info-actions" style={{ marginTop: 0, paddingTop: 0, border: 0 }}>
              {order.canCancel && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={cancelling}
                  onClick={onCancel}
                >
                  {cancelling ? 'Cancelling…' : 'Cancel this order'}
                </button>
              )}
              <Link className="btn btn-secondary" to="/profile/orders">
                All my orders
              </Link>
              <Link className="btn btn-primary" to="/shop">
                Continue shopping
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
