import { Link, NavLink, Route, Routes } from 'react-router-dom';
import Home from './pages/Home.jsx';
import Availability from './pages/Availability.jsx';
import Membership from './pages/Membership.jsx';
import Sports from './pages/Sports.jsx';
import Trial from './pages/Trial.jsx';
import Contact from './pages/Contact.jsx';
import leftLogo from './assets/brand/left.jpg';

function Layout({ children }) {
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
          <NavLink to="/sports">Sports</NavLink>
          <NavLink to="/availability">Availability</NavLink>
          <NavLink to="/membership">Membership</NavLink>
          <NavLink to="/contact">Contact</NavLink>
        </nav>
        <Link className="nav-cta" to="/trial">
          Book a trial
        </Link>
      </header>
      <main>{children}</main>
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
            <Link to="/availability">Availability</Link>
            <Link to="/membership">Plans</Link>
            <Link to="/trial">Trial</Link>
            <Link to="/contact">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/sports" element={<Sports />} />
        <Route path="/availability" element={<Availability />} />
        <Route path="/membership" element={<Membership />} />
        <Route path="/trial" element={<Trial />} />
        <Route path="/contact" element={<Contact />} />
      </Routes>
    </Layout>
  );
}
