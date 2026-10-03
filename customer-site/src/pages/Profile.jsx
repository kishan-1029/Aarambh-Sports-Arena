import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { formatCalendarDate } from '../api.js';

export function ProfileSidebar({ user, logout }) {
  const initials = (user?.name || 'User')
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <aside className="card side-card">
      <div className="person">
        <div className="avatar lg">{initials}</div>
        <div>
          <strong>{user?.name || 'Aarambh Member'}</strong>
          <span className="muted">{user?.phone ? `+91 ${user.phone}` : user?.email}</span>
        </div>
      </div>
      <nav className="side-nav">
        <NavLink to="/profile" end className={({ isActive }) => (isActive ? 'active' : '')}>
          Personal Profile
        </NavLink>
        <NavLink to="/profile/bookings" className={({ isActive }) => (isActive ? 'active' : '')}>
          My Bookings
        </NavLink>
        <NavLink to="/membership" className={({ isActive }) => (isActive ? 'active' : '')}>
          Membership
        </NavLink>
        <button
          type="button"
          onClick={logout}
          className="text-link"
          style={{ textAlign: 'left', padding: '10px 14px', color: 'var(--danger)' }}
        >
          Sign Out
        </button>
      </nav>
    </aside>
  );
}

export default function Profile() {
  const { user, ready, logout } = useAuth();
  const navigate = useNavigate();

  if (!ready) {
    return (
      <div className="container" style={{ padding: '80px 0', textAlign: 'center' }}>
        <p className="text-muted">Loading profile…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container" style={{ padding: '80px 0', textAlign: 'center' }}>
        <h2 style={{ marginBottom: 12 }}>Please sign in</h2>
        <p className="text-muted" style={{ marginBottom: 20 }}>
          You must be logged in to view your profile and bookings.
        </p>
        <button type="button" className="btn btn-primary" onClick={() => navigate('/login')}>
          Sign In
        </button>
      </div>
    );
  }

  const tier = user.tierKey ? user.tierKey.toUpperCase() : 'NONE';
  const status = user.status ? user.status.toUpperCase() : 'ACTIVE';

  return (
    <section className="page container">
      <div className="profile-layout">
        <ProfileSidebar user={user} logout={logout} />

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 style={{ margin: 0, fontSize: '1.4rem' }}>Personal Profile</h2>
            <span className={`badge ${status === 'ACTIVE' ? 'badge-active' : 'badge-neutral'}`}>
              {tier} MEMBER
            </span>
          </div>

          <div className="kv">
            <span>Full Name</span>
            <strong>{user.name}</strong>

            <span>Phone</span>
            <strong>{user.phone ? `+91 ${user.phone}` : '—'}</strong>

            <span>Email</span>
            <strong>{user.email || '—'}</strong>

            <span>Date of Birth</span>
            <strong>
              {user.dob ? formatCalendarDate(user.dob, { dateStyle: 'medium' }) : '—'}
            </strong>

            <span>Membership Tier</span>
            <div>
              <span className="badge badge-active">{tier}</span>
            </div>

            <span>Account Status</span>
            <div>
              <span className={`badge ${status === 'ACTIVE' ? 'badge-active' : 'badge-neutral'}`}>
                {status}
              </span>
            </div>

            <span>Membership Valid Until</span>
            <strong>
              {user.membershipEndDate
                ? formatCalendarDate(user.membershipEndDate, { dateStyle: 'medium' })
                : 'Standard pay-per-booking rate'}
            </strong>
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
            <Link to="/booking" className="btn btn-primary">
              Book a Court
            </Link>
            <Link to="/membership" className="btn btn-secondary">
              View Membership Plans
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
