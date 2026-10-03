import { useEffect, useState } from 'react';
import { api, mediaUrl } from '../api';
import Skeleton from '../components/Skeleton.jsx';

export default function Blogs() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api
      .blogs()
      .then((rows) => {
        if (!alive) return;
        setPosts(Array.isArray(rows) ? rows : []);
        setError('');
      })
      .catch((err) => {
        if (!alive) return;
        setError(err?.message || 'Blogs unavailable');
        setPosts([]);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <section className="section">
      <div className="section-head">
        <h2>Club stories & guides</h2>
        <p>Tips, membership notes and court culture — managed from the admin CMS.</p>
      </div>
      {loading && <Skeleton rows={6} height={20} />}
      {!loading && error && <p className="text-muted">{error}</p>}
      {!loading && !error && posts.length === 0 && (
        <p className="text-muted">No published posts yet. Toggle Show blogs in Club settings after seeding.</p>
      )}
      {!loading && !error && posts.length > 0 && (
        <div className="blog-grid">
          {posts.map((p) => (
            <article className="blog-card" key={p.id}>
              <div
                className="blog-cover"
                style={{
                  backgroundImage: `url(${mediaUrl(p.featuredImage)})`,
                }}
                role="img"
                aria-label={p.featuredImageAlt || p.title}
              />
              <div className="blog-body">
                <div className="blog-meta">
                  <span>{p.category || 'Club'}</span>
                  <span>{p.readingTime || 3} min</span>
                </div>
                <h3>{p.title}</h3>
                <p>{p.excerpt}</p>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
