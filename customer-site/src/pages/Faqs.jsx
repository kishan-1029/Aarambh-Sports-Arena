import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';

export default function Faqs() {
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api
      .faqs()
      .then((data) => {
        if (!alive) return;
        setCategories(Array.isArray(data?.categories) ? data.categories : []);
        setError('');
      })
      .catch((err) => {
        if (!alive) return;
        setError(err?.message || 'Could not load FAQs');
        setCategories([]);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <section className="section container form-page">
      <div className="page-head">
        <h1>FAQs</h1>
        <p className="lede">
          Answers about courts, membership, trials, and the Pro Shop. Still stuck?{' '}
          <Link to="/contact">Contact us</Link>.
        </p>
      </div>

      {loading && <p className="muted">Loading FAQs…</p>}
      {error && !loading && <p className="text-danger">{error}</p>}
      {!loading && !error && !categories.length && (
        <p className="muted">No FAQs published yet. Check back soon.</p>
      )}

      <div className="faq-list">
        {categories.map((cat) => (
          <div key={cat._id || cat.name} className="faq-category">
            <h2>{cat.name}</h2>
            {(cat.faqs || []).map((faq) => {
              const id = faq._id || faq.question;
              const open = openId === id;
              return (
                <div key={id} className={`faq-item ${open ? 'open' : ''}`}>
                  <button
                    type="button"
                    className="faq-q"
                    aria-expanded={open}
                    onClick={() => setOpenId(open ? null : id)}
                  >
                    {faq.question}
                    <span aria-hidden="true">{open ? '−' : '+'}</span>
                  </button>
                  {open ? (
                    <div
                      className="faq-a"
                      dangerouslySetInnerHTML={{ __html: faq.answer || '' }}
                    />
                  ) : null}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}
