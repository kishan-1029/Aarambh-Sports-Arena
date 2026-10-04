import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, mediaUrl } from '../api.js';
import { useCart } from '../cart.jsx';
import { useToast } from '../toast.jsx';
import ProductCard from '../components/ProductCard.jsx';
import { SkeletonCards } from '../components/Skeleton.jsx';

const SORTS = [
  { value: 'featured', label: 'Featured' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'newest', label: 'Newest' },
];

export default function Shop() {
  const [params, setParams] = useSearchParams();
  const { addItem, cart } = useCart();
  const toast = useToast();

  const category = params.get('category') || '';
  const sort = params.get('sort') || 'featured';
  const availability = params.get('availability') || 'all';
  const brand = params.get('brand') || '';
  const q = params.get('q') || '';

  const [search, setSearch] = useState(q);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [addingId, setAddingId] = useState(null);

  useEffect(() => {
    setSearch(q);
  }, [q]);

  useEffect(() => {
    Promise.all([api.shopCategories(), api.shopBrands()])
      .then(([cats, brandRows]) => {
        setCategories(Array.isArray(cats) ? cats : []);
        setBrands(Array.isArray(brandRows) ? brandRows : []);
      })
      .catch(() => {
        setCategories([]);
        setBrands([]);
      });
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    api
      .shopProducts({ category, sort, availability, brand, q, pageSize: 48 })
      .then((rows) => {
        setProducts(Array.isArray(rows) ? rows : []);
        setTotal(Array.isArray(rows) ? rows.length : 0);
      })
      .catch(() => setError("We couldn't load the shop just now."))
      .finally(() => setLoading(false));
    // The member discount is applied server-side, so re-fetch when the cart
    // (and therefore the signed-in shopper) changes.
  }, [category, sort, availability, brand, q, cart.memberDiscountPct]);

  useEffect(() => {
    load();
  }, [load]);

  const setParam = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  const onSearch = (e) => {
    e.preventDefault();
    setParam('q', search.trim());
  };

  const onAdd = async (product) => {
    setAddingId(product.id);
    try {
      await addItem({ product, quantity: 1 });
      toast.success('Added to cart');
    } catch (err) {
      toast.error(err.message || 'Could not add that to your cart');
    } finally {
      setAddingId(null);
    }
  };

  const activeFilters = Boolean(category || brand || q || availability !== 'all');

  return (
    <section className="page container">
      <header className="page-hero">
        <span className="eyebrow">Pro Shop</span>
        <h1>Gear up for your next game.</h1>
        <p>
          Shop rackets, balls, footwear, apparel and court essentials from Aarambh Sports Arena.
          Collect at the club or have it delivered.
        </p>
      </header>

      {cart.memberDiscountPct > 0 && (
        <div className="msg msg-ok" style={{ marginBottom: 20 }}>
          Your {String(cart.tierKey || '').toUpperCase()} membership takes{' '}
          {cart.memberDiscountPct}% off everything below.
        </div>
      )}

      <nav className="shop-cats" aria-label="Product categories">
        <button
          type="button"
          className={`shop-cat ${!category ? 'on' : ''}`}
          onClick={() => setParam('category', '')}
        >
          All products
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            type="button"
            className={`shop-cat ${category === c.slug ? 'on' : ''}`}
            onClick={() => setParam('category', c.slug)}
          >
            {c.image ? (
              <img className="shop-cat-img" src={mediaUrl(c.image)} alt="" />
            ) : c.icon ? (
              <i className={c.icon} aria-hidden="true" />
            ) : null}
            {c.name}
            <span className="shop-cat-count">{c.productCount}</span>
          </button>
        ))}
      </nav>

      <div className="shop-toolbar">
        <form className="shop-search" onSubmit={onSearch} role="search">
          <input
            type="search"
            value={search}
            placeholder="Search rackets, shoes, brands…"
            aria-label="Search products"
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit" className="btn btn-secondary">
            Search
          </button>
        </form>

        <div className="shop-filters">
          {brands.length > 1 && (
            <label className="shop-select">
              <span>Brand</span>
              <select value={brand} onChange={(e) => setParam('brand', e.target.value)}>
                <option value="">All brands</option>
                {brands.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="shop-select">
            <span>Availability</span>
            <select
              value={availability}
              onChange={(e) => setParam('availability', e.target.value)}
            >
              <option value="all">Everything</option>
              <option value="in_stock">In stock only</option>
            </select>
          </label>
          <label className="shop-select">
            <span>Sort</span>
            <select value={sort} onChange={(e) => setParam('sort', e.target.value)}>
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {loading && <SkeletonCards count={8} className="product-grid" />}
      {error && (
        <div className="msg msg-err">
          {error}{' '}
          <button type="button" className="text-link" onClick={load}>
            Try again
          </button>
        </div>
      )}

      {!loading && !error && products.length === 0 && (
        <div className="empty">
          {activeFilters ? (
            <>
              Nothing matches those filters.{' '}
              <button type="button" className="text-link" onClick={() => setParams({}, { replace: true })}>
                Clear all
              </button>
            </>
          ) : (
            'The Pro Shop is being restocked. Please check back shortly.'
          )}
        </div>
      )}

      {!loading && !error && products.length > 0 && (
        <>
          <p className="shop-count muted">
            {total} {total === 1 ? 'product' : 'products'}
            {category ? ` in ${categories.find((c) => c.slug === category)?.name || category}` : ''}
          </p>
          <div className="product-grid">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                adding={addingId === product.id}
                onAdd={onAdd}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
