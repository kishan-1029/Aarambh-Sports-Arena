import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, formatPaise, mediaUrl } from '../api.js';
import { useCart } from '../cart.jsx';
import { useToast } from '../toast.jsx';
import Skeleton from '../components/Skeleton.jsx';

const STOCK_LABEL = {
  in_stock: 'In stock',
  low_stock: 'Only a few left',
  out_of_stock: 'Out of stock',
  not_tracked: 'Available',
};

export default function ProductDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { addItem, cart } = useCart();
  const toast = useToast();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [variantId, setVariantId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [imageIndex, setImageIndex] = useState(0);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    setVariantId('');
    setQuantity(1);
    setImageIndex(0);

    api
      .shopProduct(slug)
      .then((data) => {
        if (!active) return;
        setProduct(data);
        const firstAvailable = (data.variants || []).find((v) => v.stockStatus !== 'out_of_stock');
        if (firstAvailable) setVariantId(firstAvailable.id);
      })
      .catch((err) => {
        if (!active) return;
        setError(err.status === 404 ? 'That product is no longer available.' : "We couldn't load this product.");
      })
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
  }, [slug, cart.memberDiscountPct]);

  const variant = useMemo(
    () => (product?.variants || []).find((v) => v.id === variantId) || null,
    [product, variantId],
  );

  const pricing = variant || product;
  const stockStatus = variant ? variant.stockStatus : product?.stockStatus;
  const available = variant ? variant.stockQuantity : product?.stockQuantity;
  const needsVariant = Boolean(product?.hasVariants);
  const outOfStock = stockStatus === 'out_of_stock';
  const maxQty = Math.max(1, Math.min(available ?? 20, 20));

  /**
   * Adds the selected variant at the selected quantity. The quantity reset and
   * the navigation only happen once the cart has actually accepted the line, so
   * a stock rejection leaves the customer on the page with their choices intact.
   */
  const onAdd = async (destination) => {
    if (needsVariant && !variantId) {
      toast.error('Please choose an option first');
      return;
    }
    if (adding) return;
    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty < 1) {
      toast.error('Please choose a quantity');
      return;
    }

    setAdding(true);
    try {
      await addItem({ product, variant, quantity: qty });
      toast.success('Added to cart');
      setQuantity(1);
      navigate(destination);
    } catch (err) {
      toast.error(err.message || 'Could not add that to your cart');
    } finally {
      setAdding(false);
    }
  };

  if (loading) {
    return (
      <section className="page container">
        <div className="product-page">
          <div className="skeleton" style={{ height: 420, borderRadius: 20 }} />
          <div className="stack">
            <Skeleton rows={6} />
          </div>
        </div>
      </section>
    );
  }

  if (error || !product) {
    return (
      <section className="page container">
        <div className="empty">
          {error || 'Product not found.'}
          <div style={{ marginTop: 16 }}>
            <Link className="btn btn-primary" to="/shop">
              Back to the shop
            </Link>
          </div>
        </div>
      </section>
    );
  }

  const images = product.images.length ? product.images : [{ url: '', altText: product.name }];
  const activeImage = images[Math.min(imageIndex, images.length - 1)];

  return (
    <section className="page container">
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link to="/shop">Pro Shop</Link>
        <span aria-hidden="true">/</span>
        <Link to={`/shop?category=${encodeURIComponent(product.categorySlug)}`}>
          {product.categoryName}
        </Link>
        <span aria-hidden="true">/</span>
        <span className="muted">{product.name}</span>
      </nav>

      <div className="product-page">
        <div className="product-gallery">
          <div className="product-gallery-main">
            {activeImage.url ? (
              <img src={mediaUrl(activeImage.url)} alt={activeImage.altText || product.name} />
            ) : (
              <div className="product-thumb-empty product-gallery-empty">
                <span>
                  {product.name
                    .split(' ')
                    .filter(Boolean)
                    .map((w) => w[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase()}
                </span>
              </div>
            )}
          </div>
          {images.length > 1 && (
            <div className="product-thumbs">
              {images.map((img, index) => (
                <button
                  key={img.url}
                  type="button"
                  className={`product-thumb-btn ${index === imageIndex ? 'on' : ''}`}
                  aria-label={`View image ${index + 1}`}
                  onClick={() => setImageIndex(index)}
                >
                  <img src={mediaUrl(img.url)} alt="" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="product-info">
          <span className="chip">{product.categoryName}</span>
          <h1>{product.name}</h1>
          {product.brand && <p className="muted product-brand">by {product.brand}</p>}
          {product.shortDescription && <p className="lead">{product.shortDescription}</p>}

          <div className="product-price-row">
            <strong>{formatPaise(pricing.pricePaise)}</strong>
            {pricing.mrpPaise > pricing.pricePaise && (
              <>
                <s>{formatPaise(pricing.mrpPaise)}</s>
                <span className="badge badge-active">{pricing.mrpDiscountPct}% off</span>
              </>
            )}
          </div>
          {product.taxRatePct > 0 && (
            <p className="muted product-tax-note">+ {product.taxRatePct}% GST at checkout</p>
          )}

          {pricing.memberDiscountPct > 0 ? (
            <div className="member-price">
              <strong>Member price {formatPaise(pricing.memberPricePaise)}</strong>
              <span>
                You save {formatPaise(pricing.memberSavingPaise)} with your{' '}
                {String(cart.tierKey || 'club').toUpperCase()} membership
              </span>
            </div>
          ) : (
            product.memberDiscountEligible && (
              <div className="member-price member-price-hint">
                <strong>Members pay less</strong>
                <span>
                  <Link to="/membership">Join the club</Link> to unlock the shop discount on this item.
                </span>
              </div>
            )
          )}

          <p className={`stock-pill stock-${stockStatus}`}>
            {STOCK_LABEL[stockStatus] || 'Available'}
            {stockStatus === 'low_stock' && available != null ? ` · ${available} left` : ''}
          </p>

          {needsVariant && (
            <div className="variant-block">
              <span className="field-label">
                {product.variants.some((v) => v.colour) ? 'Size & colour' : 'Size'}
              </span>
              <div className="variant-row">
                {product.variants.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    className={`variant-chip ${variantId === v.id ? 'on' : ''}`}
                    disabled={v.stockStatus === 'out_of_stock'}
                    title={v.stockStatus === 'out_of_stock' ? 'Out of stock' : undefined}
                    onClick={() => {
                      setVariantId(v.id);
                      setQuantity(1);
                    }}
                  >
                    {v.name || v.sku}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="qty-row">
            <span className="field-label">Quantity</span>
            <div className="qty-stepper">
              <button
                type="button"
                aria-label="Decrease quantity"
                disabled={quantity <= 1}
                onClick={() => setQuantity((n) => Math.max(1, n - 1))}
              >
                −
              </button>
              <span>{quantity}</span>
              <button
                type="button"
                aria-label="Increase quantity"
                disabled={quantity >= maxQty || outOfStock}
                onClick={() => setQuantity((n) => Math.min(maxQty, n + 1))}
              >
                +
              </button>
            </div>
          </div>

          <div className="product-cta">
            <button
              type="button"
              className="btn btn-secondary"
              disabled={outOfStock || adding}
              onClick={() => onAdd('/shop')}
            >
              {adding ? 'Adding…' : 'Add to cart'}
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={outOfStock || adding}
              onClick={() => onAdd('/cart')}
            >
              Buy now
            </button>
          </div>

          <div className="fulfil-note">
            <span className="field-label">Available for</span>
            <ul>
              {product.fulfillment.pickup && <li>Club pickup — Vadodara, Gujarat</li>}
              {product.fulfillment.delivery && <li>Delivery to your address</li>}
            </ul>
          </div>

          {product.description && (
            <div className="product-description">
              <h2 className="section-title-sm">Product details</h2>
              <p>{product.description}</p>
              <dl className="product-specs">
                <dt>SKU</dt>
                <dd>{variant?.sku || product.sku}</dd>
                {product.brand ? (
                  <>
                    <dt>Brand</dt>
                    <dd>{product.brand}</dd>
                  </>
                ) : null}
                <dt>Category</dt>
                <dd>{product.categoryName}</dd>
              </dl>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
