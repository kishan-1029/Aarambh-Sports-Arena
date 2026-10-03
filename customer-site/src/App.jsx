import { useEffect, useState } from 'react';
import { Link, NavLink, Route, Routes } from 'react-router-dom';
import Home from './pages/Home.jsx';
import Availability from './pages/Availability.jsx';
import Membership from './pages/Membership.jsx';
import Sports from './pages/Sports.jsx';
import Trial from './pages/Trial.jsx';
import Contact from './pages/Contact.jsx';
import Blogs from './pages/Blogs.jsx';
import { api } from './api.js';
import leftLogo from './assets/brand/left.jpg';

const DEFAULT_FEATURES = {
  publicSiteEnabled: true,
  showMembershipPlans: true,
  showSports: true,
  showAvailability: true,
  showBlogs: true,
  showTrial: true,
  showContact: true,
};

function Layout({ children, features }) {
  const f = features || DEFAULT_FEATURES;
  return (
    <div className="shell">
      <header className="topnav">
        <Link to="/" className="brand brand-lockup" aria-label="Arambh Sports Arena">
          <span className="brand-symbol" style={{ backgroundImage: `url(${leftLogo})` }} />
          <span className="brand-text">
            Arambh <span>Sports Arena</span>
          </span>
        </Link>
        <nav className="nav-links" aria-label="Primary">
          {f.showSports !== false && <NavLink to="/sports">Sports</NavLink>}
          {f.showAvailability !== false && <NavLink to="/availability">Availability</NavLink>}
          {f.showMembershipPlans !== false && <NavLink to="/membership">Membership</NavLink>}
          {f.showBlogs !== false && <NavLink to="/blogs">Blogs</NavLink>}
          {f.showContact !== false && <NavLink to="/contact">Contact</NavLink>}
        </nav>
        {f.showTrial !== false && (
          <Link className="nav-cta" to="/trial">
            Book a trial
          </Link>
        )}
      </header>
      <main>
        {f.publicSiteEnabled === false ? (
          <section className="section">
            <div className="section-head">
              <h2>We’ll be right back</h2>
              <p>The public site is temporarily turned off from the club admin panel.</p>
            </div>
          </section>
        ) : (
          children
        )}
      </main>
      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <span className="brand-symbol footer-symbol" style={{ backgroundImage: `url(${leftLogo})` }} />
            <div>
              <strong>Arambh Sports Arena</strong>
              <div>Vadodara · Courts · Membership · Live slots</div>
            </div>
          </div>
          <div className="footer-links">
            {f.showAvailability !== false && <Link to="/availability">Availability</Link>}
            {f.showMembershipPlans !== false && <Link to="/membership">Plans</Link>}
            {f.showBlogs !== false && <Link to="/blogs">Blogs</Link>}
            {f.showTrial !== false && <Link to="/trial">Trial</Link>}
            {f.showContact !== false && <Link to="/contact">Contact</Link>}
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  const [features, setFeatures] = useState(DEFAULT_FEATURES);

  useEffect(() => {
    api
      .club()
      .then((c) => {
        if (c?.features) setFeatures({ ...DEFAULT_FEATURES, ...c.features });
      })
      .catch(() => {});
  }, []);

  return (
    <Layout features={features}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/sports" element={<Sports />} />
        <Route path="/availability" element={<Availability />} />
        <Route path="/membership" element={<Membership />} />
        <Route path="/blogs" element={<Blogs />} />
        <Route path="/trial" element={<Trial />} />
        <Route path="/contact" element={<Contact />} />
      </Routes>
    </Layout>
  );
}
