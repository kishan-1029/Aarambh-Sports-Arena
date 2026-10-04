import { Link } from 'react-router-dom';
import { formatPaise, mediaUrl } from '../api.js';

const STOCK_LABEL = {
  in_stock: 'In stock',
  low_stock: 'Low stock',
  out_of_stock: 'Out of stock',
  not_tracked: 'Available',
};

/** Two-letter fallback so a product without a photo still looks deliberate. */
export function ProductThumb({ product, className = 'product-thumb' }) {
  if (product.image) {
    return (
      <div className={className}>
        <img src={mediaUrl(product.image)} alt={product.imageAlt || product.name} loading="lazy" />
      </div>
    );
  }
  const initials = (product.name || '?')
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <div className={`${className} product-thumb-empty`} aria-hidden="true">
      <span>{initials}</span>
    </div>
  );
}

export default function ProductCard({ product, onAdd, adding = false }) {
  const outOfStock = product.stockStatus === 'out_of_stock';
  const hasMemberPrice = product.memberDiscountPct > 0;

  return (
    <article className="product-card">
      <Link to={`/shop/${product.slug}`} className="product-card-media" tabIndex={-1} aria-hidden="true">
        <ProductThumb product={product} />
        {product.mrpDiscountPct > 0 && !outOfStock && (
          <span className="product-flag">{product.mrpDiscountPct}% off</span>
        )}
        {outOfStock && <span className="product-flag product-flag-muted">Sold out</span>}
      </Link>

      <div className="product-card-body">
        <span className="product-cat">{product.categoryName || product.brand}</span>
        <h3>
          <Link to={`/shop/${product.slug}`}>{product.name}</Link>
        </h3>

        <div className="product-price">
          <strong>{formatPaise(product.pricePaise)}</strong>
          {product.mrpPaise > product.pricePaise && (
            <s>{formatPaise(product.mrpPaise)}</s>
          )}
        </div>
        {hasMemberPrice ? (
          <p className="product-member">
            Member price {formatPaise(product.memberPricePaise)}
          </p>
        ) : (
          <p className="product-member product-member-empty">&nbsp;</p>
        )}

        <span className={`stock-pill stock-${product.stockStatus}`}>
          {STOCK_LABEL[product.stockStatus] || 'Available'}
        </span>
      </div>

      <div className="product-card-actions">
        <Link className="btn btn-secondary" to={`/shop/${product.slug}`}>
          View
        </Link>
        {product.hasVariants ? (
          <Link className="btn btn-primary" to={`/shop/${product.slug}`}>
            Choose option
          </Link>
        ) : (
          <button
            type="button"
            className="btn btn-primary"
            disabled={outOfStock || adding}
            onClick={() => onAdd?.(product)}
          >
            {adding ? 'Adding…' : outOfStock ? 'Sold out' : 'Add to cart'}
          </button>
        )}
      </div>
    </article>
  );
}
