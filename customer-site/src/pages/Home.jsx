import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, formatPaise, planMonthlyPaise } from '../api';
import Skeleton from '../components/Skeleton.jsx';
import heroImg from '../assets/hero.png';
import leftLogo from '../assets/brand/left.jpg';

export default function Home() {
  const [club, setClub] = useState(null);
  const [plans, setPlans] = useState([]);
  const [sports, setSports] = useState([]);
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const features = club?.features || {};

  useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.all([
      api.club().catch(() => null),
      api.plans().catch(() => []),
      api.sports().catch(() => []),
      api.blogs(3).catch(() => []),
    ])
      .then(([c, p, s, b]) => {
        if (!alive) return;
        setClub(c);
        setPlans(Array.isArray(p) ? p.slice(0, 3) : []);
        setSports(Array.isArray(s) ? s.slice(0, 4) : []);
        setBlogs(Array.isArray(b) ? b.slice(0, 3) : []);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const loc = club?.location;

  return (
    <>
      <section className="hero">
        <div className="hero-media" aria-hidden="true">
          <img src={heroImg} alt="" />
        </div>
        <div className="hero-inner">
          <span
            className="brand-symbol"
            style={{
              width: 72,
              height: 72,
              marginBottom: '1rem',
              backgroundImage: `url(${leftLogo})`,
              boxShadow: '0 12px 32px rgba(0,0,0,0.25)',
            }}
            aria-hidden="true"
          />
          <div className="hero-kicker">Vadodara · Multi-sport club</div>
          <h1>{club?.name || 'Aarambh Sports Arena'}</h1>
          <p className="hero-lead">
            Train. Play. Belong. Live court availability, clear memberships, and a trial
            you can book without the WhatsApp maze.
          </p>
          <div className="hero-actions">
            {features.showTrial !== false && (
              <Link className="btn btn-primary" to="/trial">
                Book a trial
              </Link>
            )}
            {features.showAvailability !== false && (
              <Link className="btn btn-ghost" to="/availability">
                See availability
              </Link>
            )}
          </div>
        </div>
      </section>

      {features.showSports !== false && (
        <section className="band">
          <div className="section">
            <div className="section-head">
              <h2>Courts built for busy evenings</h2>
              <p>Live sports and court counts from the admin facilities module.</p>
            </div>
            {loading ? (
              <Skeleton rows={4} height={48} />
            ) : (
              <div className="sport-rail">
                {sports.map((s) => (
                  <Link className="sport-tile" key={s.id || s.key || s.name} to="/sports">
                    <div className="code">{s.key || 'sport'}</div>
                    <h3>{s.name}</h3>
                    <p>
                      {s.courtCount != null
                        ? `${s.courtCount} court${s.courtCount === 1 ? '' : 's'} · ${s.sessionMinutes || 60} min sessions`
                        : 'Open for members and trials'}
                    </p>
                  </Link>
                ))}
                {!sports.length && <p className="text-muted">No active sports yet — enable them in admin Courts.</p>}
              </div>
            )}
          </div>
        </section>
      )}

      <section className="section">
        <div className="section-head">
          <h2>How it works</h2>
          <p>Three steps from “free tonight?” to “see you on court.”</p>
        </div>
        <div className="steps">
          <div className="step">
            <div className="n">01</div>
            <h3>Pick a sport</h3>
            <p>Choose from the sports published in the admin panel.</p>
          </div>
          <div className="step">
            <div className="n">02</div>
            <h3>Check the grid</h3>
            <p>Live free/busy slots for the week. No member names. No guesswork.</p>
          </div>
          <div className="step">
            <div className="n">03</div>
            <h3>Book a trial</h3>
            <p>Send a request. Front desk confirms. Walk in ready to play.</p>
          </div>
        </div>
      </section>

      {features.showMembershipPlans !== false && (
        <section className="section" style={{ paddingTop: 0 }}>
          <div className="section-head">
            <h2>Membership that matches how often you play</h2>
            <p>Plans and prices come live from admin Membership Plans (inactive plans stay hidden).</p>
          </div>
          {loading ? (
            <Skeleton rows={5} height={24} />
          ) : (
            <div className="plan-grid">
              {plans.map((p, idx) => (
                <div className={`plan ${idx === 0 ? 'featured' : ''}`} key={p.id || p.key || p.name}>
                  <span className="tag">{p.key || 'plan'}</span>
                  <h3>{p.name}</h3>
                  <p>{p.description || 'Club membership with court benefits.'}</p>
                  <div className="price">
                    {formatPaise(planMonthlyPaise(p))}
                    <small>from / month</small>
                  </div>
                  <ul className="perk-list">
                    {(p.entitlements?.perks?.length
                      ? p.entitlements.perks
                      : ['Court access', 'Member rates']
                    )
                      .slice(0, 4)
                      .map((perk) => (
                        <li className="perk" key={perk}>
                          {perk}
                        </li>
                      ))}
                  </ul>
                  <Link className={`btn ${idx === 0 ? 'btn-primary' : 'btn-outline'}`} to="/membership">
                    Compare plans
                  </Link>
                </div>
              ))}
              {!plans.length && (
                <p className="text-muted">No active plans — turn plans on in admin Membership Plans.</p>
              )}
            </div>
          )}
        </section>
      )}

      {features.showBlogs !== false && blogs.length > 0 && (
        <section className="section" style={{ paddingTop: 0 }}>
          <div className="section-head">
            <h2>From the club desk</h2>
            <p>Latest guides — seeded and editable in CMS Blog Master.</p>
          </div>
          <div className="blog-grid">
            {blogs.map((b) => (
              <Link className="blog-card" key={b.id} to="/blogs">
                <div className="blog-body">
                  <div className="blog-meta">
                    <span>{b.category || 'Club'}</span>
                  </div>
                  <h3>{b.title}</h3>
                  <p>{b.excerpt}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="section-head">
          <h2>Find us</h2>
          <p>Aarambh Sports Arena — easy to reach, hard to leave after a good set.</p>
        </div>
        <div className="location-strip">
          <div className="location-panel">
            <h3>{loc?.name || 'Main club'}</h3>
            <p>{loc?.address || 'Vadodara, Gujarat'}</p>
            <p>{loc?.phone || '+91-9999999999'}</p>
            <p>{loc?.timezone || 'Asia/Kolkata'} · Open evenings & weekends</p>
            <div style={{ marginTop: '1.1rem' }}>
              {features.showContact !== false && (
                <Link className="btn btn-solid" to="/contact">
                  Contact the club
                </Link>
              )}
            </div>
          </div>
          <div className="map-panel">
            <div>
              <strong>Vadodara</strong>
              <div>Gujarat · India</div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
