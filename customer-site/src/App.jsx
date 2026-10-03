import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import Home from './pages/Home.jsx';
import Availability from './pages/Availability.jsx';
import Membership from './pages/Membership.jsx';
import Sports from './pages/Sports.jsx';
import Trial from './pages/Trial.jsx';
import Contact from './pages/Contact.jsx';
import Blogs from './pages/Blogs.jsx';
import Booking from './pages/Booking.jsx';
import Profile from './pages/Profile.jsx';
import MyBookings from './pages/MyBookings.jsx';
import ComingSoon from './pages/ComingSoon.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import { AuthProvider, useAuth } from './auth.jsx';
import { AuthDialogProvider, useAuthDialog } from './authDialog.jsx';
import { ToastProvider } from './toast.jsx';
import { ThemeProvider, useTheme } from './theme.jsx';
import { api } from './api.js';
import logoHorizontal from './assets/brand/logo-horizontal.png';

const DEFAULT_FEATURES = {
  publicSiteEnabled: true,
  showMembershipPlans: true,
  showSports: true,
  showAvailability: true,
  showBlogs: true,
  showTrial: true,
  showContact: true,
};

function NavHeader({ features }) {
  const f = features || DEFAULT_FEATURES;
  const { user, logout } = useAuth();
  const { openAuth } = useAuthDialog();
  const { theme, toggle } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const dropdownRef = useRef(null);
  const location = useLocation();

  // Close dropdown and mobile menu on navigation
  useEffect(() => {
    setMenuOpen(false);
    setMobileNavOpen(false);
  }, [location.pathname]);

  // Click outside listener for dropdown
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [menuOpen]);

  const initials = (user?.name || 'User')
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const firstName = user?.name ? user.name.split(' ')[0] : 'Member';

  return (
    <header className="topnav">
      <div className="nav-inner">
        <Link to="/" className="brand brand-lockup" aria-label="Aarambh Sports Arena">
          <img className="brand-logo" src={logoHorizontal} alt="Aarambh Sports Arena" />
        </Link>

        <button
          type="button"
          className="menu-toggle"
          aria-label="Toggle navigation menu"
          onClick={() => setMobileNavOpen(!mobileNavOpen)}
        >
          {mobileNavOpen ? '✕ Close' : '☰ Menu'}
        </button>

        <nav className={`nav-links ${mobileNavOpen ? 'open' : ''}`} aria-label="Primary">
          {f.showSports !== false && <NavLink to="/sports">Sports</NavLink>}
          {f.showAvailability !== false && <NavLink to="/availability">Availability</NavLink>}
          {f.showMembershipPlans !== false && <NavLink to="/membership">Membership</NavLink>}
          {f.showContact !== false && <NavLink to="/contact">Contact</NavLink>}
          {user && <NavLink to="/booking">Book Court</NavLink>}
          {user && <NavLink to="/profile/bookings">My Bookings</NavLink>}

          {/* Mobile only actions */}
          <div className="mobile-only">
            <button type="button" className="btn btn-secondary btn-block" onClick={toggle}>
              {theme === 'dark' ? 'Light mode' : 'Dark mode'}
            </button>
            {user ? (
              <>
                <Link to="/profile" className="btn btn-secondary btn-block">
                  {user.name} (Profile)
                </Link>
                <button
                  type="button"
                  className="btn btn-outline btn-block"
                  style={{ color: 'var(--danger)' }}
                  onClick={logout}
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="btn btn-secondary btn-block"
                  onClick={() => openAuth({ mode: 'login' })}
                >
                  Sign In
                </button>
                {f.showTrial !== false && (
                  <Link to="/trial" className="btn btn-primary btn-block">
                    Book a Trial
                  </Link>
                )}
              </>
            )}
          </div>
        </nav>

        <div className="nav-account desktop-only">
          <button
            type="button"
            className="theme-switch"
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-pressed={theme === 'dark'}
            onClick={toggle}
          >
            <span />
          </button>
          {user ? (
            <div style={{ position: 'relative' }} ref={dropdownRef}>
              <button
                type="button"
                className="profile-trigger"
                onClick={() => setMenuOpen(!menuOpen)}
                aria-expanded={menuOpen}
              >
                <span className="avatar">{initials}</span>
                <span>{firstName}</span>
                <span style={{ fontSize: 10, marginLeft: 2 }}>▼</span>
              </button>

              {menuOpen && (
                <div className="dropdown">
                  <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--line)', marginBottom: 4 }}>
                    <strong style={{ display: 'block', fontSize: 14 }}>{user.name}</strong>
                    <span className="muted" style={{ fontSize: 12 }}>
                      {user.email || user.phone}
                    </span>
                  </div>
                  <Link to="/profile">Personal Profile</Link>
                  <Link to="/profile/bookings">My Bookings</Link>
                  <Link to="/membership">Membership</Link>
                  <button
                    type="button"
                    onClick={logout}
                    style={{ color: 'var(--danger)', cursor: 'pointer', padding: '8px 12px' }}
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => openAuth({ mode: 'login' })}
              >
                Sign In
              </button>
              {f.showTrial !== false && (
                <Link to="/trial" className="btn btn-primary">
                  Book a Trial
                </Link>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function SiteFooter({ features }) {
  const f = features || DEFAULT_FEATURES;
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <img className="footer-logo" src={logoHorizontal} alt="Aarambh Sports Arena" />
          <p className="muted" style={{ margin: '8px 0 0', fontSize: 14 }}>
            Vadodara · Premium Badminton & Pickleball Courts · Live Slots
          </p>
        </div>
        <div className="footer-links">
          {f.showSports !== false && <Link to="/sports">Sports</Link>}
          {f.showAvailability !== false && <Link to="/availability">Availability</Link>}
          {f.showMembershipPlans !== false && <Link to="/membership">Membership Plans</Link>}
          {f.showTrial !== false && <Link to="/trial">Book a Trial</Link>}
          {f.showContact !== false && <Link to="/contact">Contact</Link>}
          <Link to="/cafeteria">Cafeteria</Link>
          <Link to="/shop">Pro Shop</Link>
        </div>
      </div>
      <div className="container" style={{ borderTop: '1px solid var(--line)', padding: '20px 0', marginTop: 32, textAlign: 'center' }}>
        <p className="muted" style={{ margin: 0, fontSize: 13 }}>
          © 2026 Aarambh Sports Arena. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

function MainLayout({ features, children }) {
  const f = features || DEFAULT_FEATURES;
  return (
    <div className="shell">
      <div className="mark-field" aria-hidden="true" />
      <NavHeader features={f} />
      <main>
        {f.publicSiteEnabled === false ? (
          <section className="section container">
            <div className="card text-center" style={{ padding: '60px 20px' }}>
              <h2>We’ll be right back</h2>
              <p className="text-muted">The public site is temporarily turned off from the club admin panel.</p>
            </div>
          </section>
        ) : (
          children
        )}
      </main>
      <SiteFooter features={f} />
    </div>
  );
}

export default function App() {
  const [features, setFeatures] = useState(DEFAULT_FEATURES);

  useEffect(() => {
    api.club()
      .then((c) => {
        if (c?.features) setFeatures({ ...DEFAULT_FEATURES, ...c.features });
      })
      .catch(() => {});
  }, []);

  return (
    <ThemeProvider>
      <AuthProvider>
      <AuthDialogProvider>
        <ToastProvider>
          <MainLayout features={features}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/sports" element={<Sports />} />
              <Route path="/availability" element={<Availability />} />
              <Route path="/membership" element={<Membership />} />
              <Route path="/trial" element={<Trial />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/blogs" element={<Blogs />} />
              <Route path="/booking" element={<Booking />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/profile/bookings" element={<MyBookings />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route
                path="/cafeteria"
                element={
                  <ComingSoon
                    title="Aarambh Cafeteria"
                    subtitle="Nutritious post-game smoothies, artisanal coffee, and freshly prepared sports snacks."
                  />
                }
              />
              <Route
                path="/shop"
                element={
                  <ComingSoon
                    title="Pro Sports Shop"
                    subtitle="Professional racket restringing, grip upgrades, performance footwear, and club apparel."
                  />
                }
              />
              <Route path="*" element={<Home />} />
            </Routes>
          </MainLayout>
        </ToastProvider>
      </AuthDialogProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
