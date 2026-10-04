/**
 * One shelf. Every stock change in the club — website order, cancellation,
 * counter sale, delivery receipt, damage — goes through move() and leaves a
 * row in the inventory ledger. There is no separate "online stock".
 */
import { Product } from './product.model.js';
import { InventoryMovement, MOVEMENT_TYPES } from './inventoryMovement.model.js';
import { withTransaction } from '../../lib/db.js';
import { Conflict, NotFound, Validation } from '../../lib/errors.js';
import { parseListQuery, runListQuery } from '../../lib/listQuery.js';
import { audit } from '../audit/audit.service.js';

function actorFromCtx(ctx) {
  if (!ctx?.user?.id) return { type: 'system', name: ctx?.user?.name || 'system' };
  return {
    type: 'user',
    id: String(ctx.user.id),
    name: ctx.user.name || ctx.user.email || 'user',
  };
}

/** Variant stock wins when a product has variants. */
export function availableStock(product, variantId = null) {
  if (!product) return 0;
  if (product.trackInventory === false) return Number.POSITIVE_INFINITY;
  if (variantId) {
    const variant = (product.variants || []).find((v) => String(v._id) === String(variantId));
    return variant ? Number(variant.stockQuantity) || 0 : 0;
  }
  if (product.hasVariants) {
    return (product.variants || [])
      .filter((v) => v.active !== false)
      .reduce((total, v) => total + (Number(v.stockQuantity) || 0), 0);
  }
  return Number(product.stockQuantity) || 0;
}

export function lowStockThresholdFor(product, variant = null) {
  if (variant && variant.lowStockThreshold != null) return Number(variant.lowStockThreshold);
  return Number(product?.lowStockThreshold ?? 5);
}

/**
 * @returns {'out_of_stock'|'low_stock'|'in_stock'|'not_tracked'}
 */
export function stockStatus(product, variantId = null) {
  if (!product || product.trackInventory === false) return 'not_tracked';
  const variant = variantId
    ? (product.variants || []).find((v) => String(v._id) === String(variantId))
    : null;
  const qty = availableStock(product, variantId);
  if (qty <= 0) return 'out_of_stock';
  if (qty <= lowStockThresholdFor(product, variant)) return 'low_stock';
  return 'in_stock';
}

/**
 * The only way stock changes. Runs inside the caller's transaction so a failed
 * order never leaves a half-deducted shelf.
 *
 * @param {import('mongoose').ClientSession|null} session
 * @param {{
 *   productId: string,
 *   variantId?: string|null,
 *   qty: number,              signed — negative removes from the shelf
 *   type: 'stock_in'|'sale'|'adjustment'|'return'|'cancellation'|'damage',
 *   referenceType?: 'order'|'pos_order'|'purchase_order'|'manual'|'system',
 *   referenceId?: string,
 *   referenceLabel?: string,
 *   reason?: string,
 *   ctx?: object,
 * }} input
 */
export async function move(session, input) {
  const {
    productId,
    variantId = null,
    qty,
    type,
    referenceType = 'manual',
    referenceId = '',
    referenceLabel = '',
    reason = '',
    ctx = {},
  } = input;

  if (!MOVEMENT_TYPES.includes(type)) {
    throw Validation([{ path: 'type', message: `Unknown movement type ${type}` }]);
  }
  if (!Number.isInteger(qty) || qty === 0) {
    throw Validation([{ path: 'qty', message: 'Movement quantity must be a non-zero integer' }]);
  }

  const product = await Product.findById(productId).session(session || null).lean();
  if (!product) throw NotFound('Product');

  if (product.trackInventory === false) {
    return { skipped: true, reason: 'inventory_not_tracked' };
  }

  const usesVariant = Boolean(variantId);
  if (product.hasVariants && !usesVariant) {
    throw Validation([{ path: 'variantId', message: `${product.name} is sold by variant` }]);
  }

  let updated;
  if (usesVariant) {
    const elemMatch = { _id: variantId };
    if (qty < 0) elemMatch.stockQuantity = { $gte: -qty };
    updated = await Product.findOneAndUpdate(
      { _id: productId, variants: { $elemMatch: elemMatch } },
      { $inc: { 'variants.$[v].stockQuantity': qty } },
      {
        new: true,
        session: session || undefined,
        arrayFilters: [{ 'v._id': variantId }],
      },
    );
  } else {
    const filter = { _id: productId };
    if (qty < 0) filter.stockQuantity = { $gte: -qty };
    updated = await Product.findOneAndUpdate(
      filter,
      { $inc: { stockQuantity: qty } },
      { new: true, session: session || undefined },
    );
  }

  // The guard did not match: either the variant is gone or the shelf is short.
  if (!updated) {
    const variant = usesVariant
      ? (product.variants || []).find((v) => String(v._id) === String(variantId))
      : null;
    if (usesVariant && !variant) throw NotFound('Product variant');
    const have = availableStock(product, variantId);
    throw Conflict('INSUFFICIENT_STOCK', `Only ${have} left of ${product.name}`, {
      productId: String(product._id),
      variantId: variantId ? String(variantId) : null,
      requested: Math.abs(qty),
      available: have,
    });
  }

  const variantAfter = usesVariant
    ? (updated.variants || []).find((v) => String(v._id) === String(variantId))
    : null;
  const quantityAfter = usesVariant
    ? Number(variantAfter?.stockQuantity) || 0
    : Number(updated.stockQuantity) || 0;

  const [movement] = await InventoryMovement.create(
    [
      {
        productId: product._id,
        variantId: variantId || null,
        sku: variantAfter?.sku || product.sku,
        productName: product.name,
        variantName: variantAfter ? variantLabel(variantAfter) : '',
        type,
        quantity: qty,
        quantityBefore: quantityAfter - qty,
        quantityAfter,
        referenceType,
        referenceId: referenceId ? String(referenceId) : '',
        referenceLabel,
        reason,
        createdBy: ctx?.user?.id ? String(ctx.user.id) : '',
        createdByName: ctx?.user?.name || ctx?.user?.email || 'system',
        source: ctx?.source || 'admin',
      },
    ],
    session ? { session } : {},
  );

  return {
    movement: movement.toObject(),
    quantityBefore: quantityAfter - qty,
    quantityAfter,
    lowStock: quantityAfter <= lowStockThresholdFor(product, variantAfter),
  };
}

export function variantLabel(variant) {
  if (!variant) return '';
  if (variant.name) return variant.name;
  return [variant.size, variant.colour].filter(Boolean).join(' / ');
}

/** Admin: receive new stock. */
export async function stockIn({ productId, variantId = null, quantity, reason = '' }, ctx = {}) {
  const qty = Number(quantity);
  if (!Number.isInteger(qty) || qty <= 0) {
    throw Validation([{ path: 'quantity', message: 'Quantity must be a positive whole number' }]);
  }

  const result = await withTransaction((session) =>
    move(session, {
      productId,
      variantId,
      qty,
      type: 'stock_in',
      referenceType: 'manual',
      reason: reason || 'New shipment',
      ctx,
    }),
  );

  await audit.record({
    actor: actorFromCtx(ctx),
    source: ctx.source || 'admin',
    action: 'inventory.stock_in',
    entity: { type: 'product', id: String(productId), label: result?.movement?.productName },
    after: { quantity: qty, quantityAfter: result?.quantityAfter, reason },
    requestId: ctx.requestId,
  });

  return result;
}

/**
 * Admin: correct the shelf to a counted number. `newQuantity` is absolute;
 * the delta is what gets written to the ledger.
 */
export async function adjust({ productId, variantId = null, newQuantity, reason }, ctx = {}) {
  const target = Number(newQuantity);
  if (!Number.isInteger(target) || target < 0) {
    throw Validation([{ path: 'newQuantity', message: 'New quantity must be zero or more' }]);
  }
  if (!reason || !String(reason).trim()) {
    throw Validation([{ path: 'reason', message: 'A reason is required for every adjustment' }]);
  }

  const product = await Product.findById(productId).lean();
  if (!product) throw NotFound('Product');

  const current = variantId
    ? availableStock(product, variantId)
    : Number(product.stockQuantity) || 0;
  const delta = target - current;
  if (delta === 0) {
    return { skipped: true, reason: 'no_change', quantityAfter: current };
  }

  const result = await withTransaction((session) =>
    move(session, {
      productId,
      variantId,
      qty: delta,
      type: 'adjustment',
      referenceType: 'manual',
      reason: String(reason).trim(),
      ctx,
    }),
  );

  await audit.record({
    actor: actorFromCtx(ctx),
    source: ctx.source || 'admin',
    action: 'inventory.adjusted',
    entity: { type: 'product', id: String(productId), label: product.name },
    before: { stock: current },
    after: { stock: target, reason: String(reason).trim() },
    requestId: ctx.requestId,
  });

  return result;
}

/** Flattened stock rows — one per sellable unit (product, or variant). */
export async function listStock(req) {
  const q = req.query || {};
  const filter = { archivedAt: null };
  if (q.categoryId) filter.categoryId = q.categoryId;
  if (q.active != null && q.active !== '') filter.active = q.active === 'true' || q.active === true;
  if (q.q) {
    const rx = new RegExp(String(q.q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ name: rx }, { sku: rx }, { brand: rx }, { 'variants.sku': rx }];
  }

  const products = await Product.find(filter)
    .sort({ name: 1 })
    .populate('categoryId', 'name slug')
    .lean();

  const rows = [];
  for (const product of products) {
    if (product.hasVariants && (product.variants || []).length) {
      for (const variant of product.variants) {
        rows.push(buildStockRow(product, variant));
      }
    } else {
      rows.push(buildStockRow(product, null));
    }
  }

  const status = q.stockStatus;
  const filtered = status ? rows.filter((r) => r.stockStatus === status) : rows;

  return { data: filtered, meta: { total: filtered.length } };
}

function buildStockRow(product, variant) {
  const quantity = variant
    ? Number(variant.stockQuantity) || 0
    : Number(product.stockQuantity) || 0;
  const threshold = lowStockThresholdFor(product, variant);
  let status = 'in_stock';
  if (product.trackInventory === false) status = 'not_tracked';
  else if (quantity <= 0) status = 'out_of_stock';
  else if (quantity <= threshold) status = 'low_stock';

  return {
    productId: String(product._id),
    variantId: variant ? String(variant._id) : null,
    productName: product.name,
    variantName: variant ? variantLabel(variant) : '',
    sku: variant ? variant.sku : product.sku,
    categoryName: product.categoryId?.name || '',
    trackInventory: product.trackInventory !== false,
    active: product.active !== false && (!variant || variant.active !== false),
    stockQuantity: quantity,
    lowStockThreshold: threshold,
    stockStatus: status,
    updatedAt: variant?.updatedAt || product.updatedAt,
  };
}

export async function listMovements(req) {
  const parsed = parseListQuery(req, {
    allowedSort: ['createdAt', '-createdAt'],
    defaultSort: '-createdAt',
    defaultPageSize: 50,
    searchFields: ['sku', 'productName', 'referenceLabel'],
    buildFilter: (q) => {
      const filter = {};
      if (q.productId) filter.productId = q.productId;
      if (q.variantId) filter.variantId = q.variantId;
      if (q.type) filter.type = q.type;
      if (q.referenceId) filter.referenceId = String(q.referenceId);
      return filter;
    },
  });
  return runListQuery(InventoryMovement, parsed, { lean: true });
}

/** Dashboard + "Create PO from low stock" input. */
export async function lowStockRows() {
  const products = await Product.find({ archivedAt: null, active: true, trackInventory: true })
    .populate('categoryId', 'name')
    .lean();

  const rows = [];
  for (const product of products) {
    if (product.hasVariants && (product.variants || []).length) {
      for (const variant of product.variants) {
        if (variant.active === false) continue;
        const row = buildStockRow(product, variant);
        if (row.stockStatus !== 'in_stock') rows.push(row);
      }
    } else {
      const row = buildStockRow(product, null);
      if (row.stockStatus !== 'in_stock') rows.push(row);
    }
  }
  return rows.sort((a, b) => a.stockQuantity - b.stockQuantity);
}

export const InventoryService = {
  move,
  stockIn,
  adjust,
  listStock,
  listMovements,
  lowStockRows,
  availableStock,
  stockStatus,
};

export default InventoryService;
