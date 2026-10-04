/**
 * Server-side cart for signed-in shoppers. Guests keep a cart in the browser
 * and merge it here on sign-in. Quantities are stored; prices never are.
 */
import { Cart } from './cart.model.js';
import { Product } from './product.model.js';
import { Conflict, NotFound, Validation } from '../../lib/errors.js';
import { availableStock, stockStatus, variantLabel } from './inventory.service.js';
import { priceLine, resolveVariant, shopperContext, totalsFromLines } from './shopPricing.js';

const MAX_QTY_PER_LINE = 20;

async function loadCart(accountId) {
  let cart = await Cart.findOne({ accountId });
  if (!cart) cart = await Cart.create({ accountId, items: [] });
  return cart;
}

/**
 * Re-price the stored cart against the live catalogue. Anything that went
 * away or ran short is reported in `issues` rather than silently dropped.
 */
export async function priceCart(accountId) {
  const cart = await loadCart(accountId);
  const { entitlements, tierKey, planKey, memberDiscountPct } = await shopperContext(accountId);

  if (!cart.items.length) {
    return {
      id: String(cart._id),
      items: [],
      itemCount: 0,
      totals: totalsFromLines([], 0),
      memberDiscountPct,
      tierKey,
      planKey,
      issues: [],
    };
  }

  const products = await Product.find({ _id: { $in: cart.items.map((i) => i.productId) } })
    .populate('categoryId', 'name slug')
    .lean();
  const byId = new Map(products.map((p) => [String(p._id), p]));

  const items = [];
  const lines = [];
  const issues = [];

  for (const item of cart.items) {
    const product = byId.get(String(item.productId));
    if (!product || product.active === false || product.archivedAt) {
      issues.push({
        itemId: String(item._id),
        code: 'UNAVAILABLE',
        message: `${product?.name || 'An item'} is no longer available and was skipped.`,
      });
      continue;
    }

    const variant = resolveVariant(product, item.variantId);
    if (item.variantId && (!variant || variant.active === false)) {
      issues.push({
        itemId: String(item._id),
        code: 'VARIANT_UNAVAILABLE',
        message: `The selected option for ${product.name} is no longer available.`,
      });
      continue;
    }

    const available = availableStock(product, item.variantId);
    const tracked = product.trackInventory !== false;
    const quantity = item.quantity;
    const line = priceLine({ product, variant, quantity, entitlements });

    let issue = null;
    if (tracked && available <= 0) {
      issue = { code: 'OUT_OF_STOCK', message: 'Out of stock' };
    } else if (tracked && available < quantity) {
      issue = { code: 'INSUFFICIENT_STOCK', message: `Only ${available} left` };
    }
    if (issue) {
      issues.push({ itemId: String(item._id), ...issue, message: `${product.name}: ${issue.message}` });
    }

    lines.push(line);
    items.push({
      id: String(item._id),
      productId: String(product._id),
      variantId: variant ? String(variant._id) : null,
      slug: product.slug,
      name: product.name,
      variantName: variant ? variantLabel(variant) : '',
      brand: product.brand || '',
      categoryName: product.categoryId?.name || '',
      image: line.imageSnapshot,
      sku: line.skuSnapshot,
      quantity,
      unitPricePaise: line.unitPricePaise,
      memberDiscountPct: line.memberDiscountPct,
      memberUnitPricePaise:
        line.unitPricePaise - Math.round(line.discountPaise / Math.max(1, quantity)),
      lineSubtotalPaise: line.unitPricePaise * quantity,
      discountPaise: line.discountPaise,
      taxRatePct: line.taxRatePct,
      taxPaise: line.taxPaise,
      lineTotalPaise: line.lineTotalPaise,
      stockStatus: stockStatus(product, item.variantId),
      availableQuantity: tracked ? available : null,
      maxQuantity: tracked ? Math.min(available, MAX_QTY_PER_LINE) : MAX_QTY_PER_LINE,
      issue,
      fulfillment: {
        pickup: product.fulfillment?.pickup !== false,
        delivery: product.fulfillment?.delivery !== false,
      },
    });
  }

  return {
    id: String(cart._id),
    items,
    itemCount: items.reduce((n, i) => n + i.quantity, 0),
    totals: totalsFromLines(lines, 0),
    memberDiscountPct,
    tierKey,
    planKey,
    issues,
  };
}

export async function getCart(accountId) {
  return priceCart(accountId);
}

export async function addItem(accountId, { productId, variantId = null, quantity = 1 }) {
  const qty = Number(quantity);
  if (!Number.isInteger(qty) || qty < 1) {
    throw Validation([{ path: 'quantity', message: 'Quantity must be at least 1' }]);
  }

  const product = await Product.findById(productId).lean();
  if (!product || product.active === false || product.archivedAt) throw NotFound('Product');

  if (product.hasVariants && !variantId) {
    throw Validation([{ path: 'variantId', message: 'Please choose an option first' }]);
  }
  const variant = resolveVariant(product, variantId);
  if (variantId && (!variant || variant.active === false)) throw NotFound('Product option');

  const cart = await loadCart(accountId);
  const existing = cart.items.find(
    (i) =>
      String(i.productId) === String(product._id) &&
      String(i.variantId || '') === String(variantId || ''),
  );

  const nextQty = Math.min((existing?.quantity || 0) + qty, MAX_QTY_PER_LINE);
  assertStock(product, variantId, nextQty);

  if (existing) existing.quantity = nextQty;
  else cart.items.push({ productId: product._id, variantId: variantId || null, quantity: nextQty });

  await cart.save();
  return priceCart(accountId);
}

export async function updateItem(accountId, itemId, quantity) {
  const qty = Number(quantity);
  if (!Number.isInteger(qty) || qty < 0) {
    throw Validation([{ path: 'quantity', message: 'Quantity must be zero or more' }]);
  }

  const cart = await loadCart(accountId);
  const item = cart.items.id(itemId);
  if (!item) throw NotFound('Cart item');

  if (qty === 0) {
    item.deleteOne();
  } else {
    if (qty > MAX_QTY_PER_LINE) {
      throw Validation([
        { path: 'quantity', message: `You can order up to ${MAX_QTY_PER_LINE} of one item` },
      ]);
    }
    const product = await Product.findById(item.productId).lean();
    if (!product) throw NotFound('Product');
    assertStock(product, item.variantId, qty);
    item.quantity = qty;
  }

  await cart.save();
  return priceCart(accountId);
}

export async function removeItem(accountId, itemId) {
  const cart = await loadCart(accountId);
  const item = cart.items.id(itemId);
  if (!item) throw NotFound('Cart item');
  item.deleteOne();
  await cart.save();
  return priceCart(accountId);
}

export async function clearCart(accountId, session = null) {
  await Cart.updateOne(
    { accountId },
    { $set: { items: [] } },
    session ? { session } : {},
  );
}

/**
 * Fold a browser cart into the account cart at sign-in. Unknown or
 * unavailable rows are ignored instead of failing the whole merge.
 */
export async function mergeGuestCart(accountId, guestItems = []) {
  const rows = Array.isArray(guestItems) ? guestItems.slice(0, 50) : [];
  for (const row of rows) {
    try {
      await addItem(accountId, {
        productId: row.productId,
        variantId: row.variantId || null,
        quantity: Number(row.quantity) || 1,
      });
    } catch {
      // A stale browser cart should never block sign-in.
    }
  }
  return priceCart(accountId);
}

function assertStock(product, variantId, wantedQty) {
  if (product.trackInventory === false) return;
  const available = availableStock(product, variantId);
  if (available <= 0) {
    throw Conflict('OUT_OF_STOCK', `${product.name} is out of stock`, {
      productId: String(product._id),
      available: 0,
    });
  }
  if (wantedQty > available) {
    throw Conflict('INSUFFICIENT_STOCK', `Only ${available} left of ${product.name}`, {
      productId: String(product._id),
      available,
      requested: wantedQty,
    });
  }
}

export default {
  getCart,
  priceCart,
  addItem,
  updateItem,
  removeItem,
  clearCart,
  mergeGuestCart,
};
