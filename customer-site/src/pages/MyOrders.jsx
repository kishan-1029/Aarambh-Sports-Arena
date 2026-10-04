import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, formatPaise } from '../api.js';
import { useAuth } from '../auth.jsx';
import Skeleton from '../components/Skeleton.jsx';
import { ProfileSidebar } from './Profile.jsx';
import { FULFILMENT_LABEL, ORDER_STATUS_LABEL, statusTone } from '../shopLabels.js';

export default function MyOrders() {
  const { user, ready, logout } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (ready && !user) navigate('/', { replace: true });
  }, [ready, user, navigate]);

  useEffect(() => {
    if (!user) return;
    api
      .myOrders()
      .then((rows) => setOrders(Array.isArray(rows) ? rows : []))
      .catch(() => setError("We couldn't load your orders."))
      .finally(() => setLoading(false));
  }, [user]);

  if (!ready || !user) {
    return (
      <div className="container" style={{ padding: '80px 0', textAlign: 'center' }}>
        <Skeleton rows={4} />
      </div>
    );
  }

  return (
    <section className="page container">
      <div className="profile-layout">
        <ProfileSidebar user={user} logout={logout} />

        <div className="stack orders-panel">
          <div className="card">
            <h2 style={{ margin: 0, fontSize: '1.4rem' }}>My Orders</h2>
            <p className="muted" style={{ marginTop: 6 }}>
              Everything you have bought from the Aarambh Pro Shop.
            </p>
          </div>

          {loading && <Skeleton rows={5} />}
          {error && <div className="msg msg-err">{error}</div>}

          {!loading && !error && orders.length === 0 && (
            <div className="empty">
              You have not ordered anything yet.
              <div style={{ marginTop: 16 }}>
                <Link className="btn btn-primary" to="/shop">
                  Visit the Pro Shop
                </Link>
              </div>
            </div>
          )}

          <div className="history-list">
            {orders.map((order) => (
              <article className="card history-card" key={order.id}>
                <div>
                  <div className="history-title">{order.orderNumber}</div>
                  <div className="history-detail">
                    {order.itemCount} {order.itemCount === 1 ? 'item' : 'items'} ·{' '}
                    {FULFILMENT_LABEL[order.fulfillmentType] || order.fulfillmentType}
                  </div>
                  <div className="history-meta">
                    <span className={`badge ${statusTone(order.orderStatus)}`}>
                      {ORDER_STATUS_LABEL[order.orderStatus] || order.orderStatus}
                    </span>
                    <span>
                      {new Date(order.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                </div>
                <div style={{ textAlign: 'right', display: 'grid', gap: 8, justifyItems: 'end' }}>
                  <strong>{formatPaise(order.grandTotalPaise)}</strong>
                  <Link className="btn btn-secondary" to={`/orders/${order.orderNumber}`}>
                    View order
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
