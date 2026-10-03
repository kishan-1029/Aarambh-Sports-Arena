import { Link, NavLink, Route, Routes } from 'react-router-dom';
import Home from './pages/Home.jsx';
import Availability from './pages/Availability.jsx';
import Membership from './pages/Membership.jsx';
import Sports from './pages/Sports.jsx';
import Trial from './pages/Trial.jsx';
import Contact from './pages/Contact.jsx';
import logoHorizontal from './assets/brand/logo-horizontal.png';
import logoStacked from './assets/brand/logo-stacked.png';

function Layout({ children }) {
  return (
    <div className="shell">
      <header className="topnav">
        <Link to="/" className="brand brand-lockup" aria-label="Arambh Sports Arena">
          <img className="brand-logo" src={logoStacked} alt="Arambh Sports Arena" />
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
            <img className="footer-logo" src={logoHorizontal} alt="Arambh Sports Arena" />
            <div>Vadodara · Courts · Membership · Live slots</div>
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
