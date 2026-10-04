import { ProductCategory } from './category.model.js';
import { Product } from './product.model.js';
import { InventoryMovement } from './inventoryMovement.model.js';
import { Order } from './order.model.js';
import { Conflict, NotFound, Validation } from '../../lib/errors.js';
import { parseListQuery, runListQuery } from '../../lib/listQuery.js';
import { audit } from '../audit/audit.service.js';
import { availableStock, stockStatus, variantLabel } from './inventory.service.js';
import { displayPricing, shopperContext } from './shopPricing.js';

function actorFromCtx(ctx) {
  if (!ctx?.user?.id) return { type: 'system', name: ctx?.user?.name || 'system' };
  return {
    type: 'user',
    id: String(ctx.user.id),
    name: ctx.user.name || ctx.user.email || 'user',
  };
}

function actorLabel(ctx) {
  return ctx?.user?.name || ctx?.user?.email || 'system';
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

async function uniqueSlug(Model, base, excludeId = null) {
  const root = slugify(base) || 'item';
  let candidate = root;
  let n = 2;
  // Slugs are public URLs, so collisions get a numeric suffix rather than an error.
  while (true) {
    const filter = { slug: candidate };
    if (excludeId) filter._id = { $ne: excludeId };
    const clash = await Model.exists(filter);
    if (!clash) return candidate;
    candidate = `${root}-${n}`;
    n += 1;
  }
}

// ──────────────────────────── Categories ────────────────────────────

export async function listCategories(req) {
  const parsed = parseListQuery(req, {
    allowedSort: ['sortOrder', 'name', 'createdAt', '-createdAt'],
    defaultSort: 'sortOrder',
    defaultPageSize: 100,
    searchFields: ['name', 'slug'],
    buildFilter: (q) => {
      const filter = {};
      if (q.active != null && q.active !== '') {
        filter.active = q.active === 'true' || q.active === true;
      }
      return filter;
    },
  });
  const result = await runListQuery(ProductCategory, parsed, { lean: true });

  const counts = await Product.aggregate([
    { $match: { archivedAt: null } },
    { $group: { _id: '$categoryId', count: { $sum: 1 } } },
  ]);
  const byId = new Map(counts.map((c) => [String(c._id), c.count]));

  return {
    ...result,
    data: result.data.map((c) => ({ ...c, productCount: byId.get(String(c._id)) || 0 })),
  };
}

export async function createCategory(input, ctx = {}) {
  const name = String(input.name || '').trim();
  if (!name) throw Validation([{ path: 'name', message: 'Category name is required' }]);

  const slug = await uniqueSlug(ProductCategory, input.slug || name);
  const doc = await ProductCategory.create({
    name,
    slug,
    description: input.description || '',
    image: input.image || '',
    icon: input.icon || '',
    active: input.active !== false,
    sortOrder: Number(input.sortOrder) || 0,
    createdBy: actorLabel(ctx),
    updatedBy: actorLabel(ctx),
  });

  await audit.record({
    actor: actorFromCtx(ctx),
    source: ctx.source || 'admin',
    action: 'product_category.created',
    entity: { type: 'productCategory', id: String(doc._id), label: doc.name },
    after: { name: doc.name, slug: doc.slug, active: doc.active },
    requestId: ctx.requestId,
  });

  return doc.toObject();
}

export async function updateCategory(id, input, ctx = {}) {
  const doc = await ProductCategory.findById(id);
  if (!doc) throw NotFound('Category');

  const before = { name: doc.name, active: doc.active, sortOrder: doc.sortOrder };

  if (input.name !== undefined) doc.name = String(input.name).trim();
  if (input.description !== undefined) doc.description = input.description;
  if (input.image !== undefined) doc.image = input.image;
  if (input.icon !== undefined) doc.icon = input.icon;
  if (input.sortOrder !== undefined) doc.sortOrder = Number(input.sortOrder) || 0;
  if (input.slug) doc.slug = await uniqueSlug(ProductCategory, input.slug, doc._id);

  if (input.active !== undefined && input.active !== doc.active) {
    if (input.active === false) {
      const live = await Product.countDocuments({
        categoryId: doc._id,
        active: true,
        archivedAt: null,
      });
      if (live > 0) {
        throw Conflict(
          'CATEGORY_IN_USE',
          `${live} active product(s) still use ${doc.name}. Deactivate them first.`,
          { productCount: live },
        );
      }
    }
    doc.active = input.active;
  }

  doc.updatedBy = actorLabel(ctx);
  await doc.save();

  await audit.record({
    actor: actorFromCtx(ctx),
    source: ctx.source || 'admin',
    action: 'product_category.updated',
    entity: { type: 'productCategory', id: String(doc._id), label: doc.name },
    before,
    after: { name: doc.name, active: doc.active, sortOrder: doc.sortOrder },
    requestId: ctx.requestId,
  });

  return doc.toObject();
}

export async function deleteCategory(id, ctx = {}) {
  const doc = await ProductCategory.findById(id);
  if (!doc) throw NotFound('Category');

  const used = await Product.countDocuments({ categoryId: doc._id });
  if (used > 0) {
    throw Conflict(
      'CATEGORY_IN_USE',
      `${doc.name} still has ${used} product(s). Move or remove them first.`,
      { productCount: used },
    );
  }

  await ProductCategory.deleteOne({ _id: doc._id });
  await audit.record({
    actor: actorFromCtx(ctx),
    source: ctx.source || 'admin',
    action: 'product_category.deleted',
    entity: { type: 'productCategory', id: String(doc._id), label: doc.name },
    before: { name: doc.name, slug: doc.slug },
    requestId: ctx.requestId,
  });

  return { id: String(doc._id), deleted: true };
}

// ──────────────────────────── Products (admin) ────────────────────────────

function validatePricing(input, existing = {}) {
  const selling = input.sellingPricePaise ?? existing.sellingPricePaise;
  const mrp = input.mrpPaise ?? existing.mrpPaise ?? 0;
  const cost = input.costPricePaise ?? existing.costPricePaise ?? 0;

  const issues = [];
  if (selling == null || selling < 0) {
    issues.push({ path: 'sellingPricePaise', message: 'Selling price cannot be negative' });
  }
  if (mrp < 0) issues.push({ path: 'mrpPaise', message: 'MRP cannot be negative' });
  if (cost < 0) issues.push({ path: 'costPricePaise', message: 'Cost price cannot be negative' });
  if (mrp > 0 && selling != null && mrp < selling) {
    issues.push({ path: 'mrpPaise', message: 'MRP cannot be lower than the selling price' });
  }
  if (issues.length) throw Validation(issues);
}

function normaliseVariants(variants, productSku) {
  const rows = Array.isArray(variants) ? variants : [];
  const seen = new Set();
  return rows.map((v, index) => {
    const sku = String(v.sku || `${productSku}-${index + 1}`).trim().toUpperCase();
    if (seen.has(sku)) {
      throw Validation([{ path: `variants.${index}.sku`, message: `Duplicate SKU ${sku}` }]);
    }
    seen.add(sku);
    const stock = Number(v.stockQuantity) || 0;
    if (stock < 0) {
      throw Validation([
        { path: `variants.${index}.stockQuantity`, message: 'Stock cannot be negative' },
      ]);
    }
    return {
      ...(v._id ? { _id: v._id } : {}),
      sku,
      name: v.name || [v.size, v.colour].filter(Boolean).join(' / '),
      size: v.size || '',
      colour: v.colour || '',
      additionalPricePaise: Number(v.additionalPricePaise) || 0,
      stockQuantity: stock,
      lowStockThreshold: v.lowStockThreshold == null ? null : Number(v.lowStockThreshold),
      active: v.active !== false,
    };
  });
}

function normaliseImages(images) {
  const rows = (Array.isArray(images) ? images : [])
    .filter((i) => i && i.url)
    .map((i, index) => ({
      ...(i._id ? { _id: i._id } : {}),
      url: i.url,
      altText: i.altText || '',
      sortOrder: i.sortOrder == null ? index : Number(i.sortOrder),
      isPrimary: Boolean(i.isPrimary),
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder);

  if (rows.length && !rows.some((i) => i.isPrimary)) rows[0].isPrimary = true;
  // Exactly one primary, whichever came first.
  let found = false;
  for (const row of rows) {
    if (row.isPrimary && found) row.isPrimary = false;
    else if (row.isPrimary) found = true;
  }
  return rows;
}

export async function listProducts(req) {
  const parsed = parseListQuery(req, {
    allowedSort: ['name', 'createdAt', '-createdAt', 'sellingPricePaise', '-sellingPricePaise'],
    defaultSort: '-createdAt',
    defaultPageSize: 50,
    searchFields: ['name', 'sku', 'brand'],
    buildFilter: (q) => {
      const filter = {};
      if (q.includeArchived !== 'true') filter.archivedAt = null;
      if (q.categoryId) filter.categoryId = q.categoryId;
      if (q.active != null && q.active !== '') {
        filter.active = q.active === 'true' || q.active === true;
      }
      if (q.featured === 'true') filter.featured = true;
      return filter;
    },
  });

  const result = await runListQuery(Product, parsed, {
    lean: true,
    populate: [{ path: 'categoryId', select: 'name slug' }],
  });

  let data = result.data.map((p) => ({
    ...p,
    stockOnHand: availableStock(p),
    stockStatus: stockStatus(p),
    primaryImage:
      (p.images || []).find((i) => i.isPrimary)?.url || (p.images || [])[0]?.url || '',
  }));

  const stockFilter = req.query?.stockStatus;
  if (stockFilter) data = data.filter((p) => p.stockStatus === stockFilter);

  return { ...result, data };
}

export async function getProduct(id) {
  const product = await Product.findById(id).populate('categoryId', 'name slug').lean();
  if (!product) throw NotFound('Product');
  return {
    ...product,
    stockOnHand: availableStock(product),
    stockStatus: stockStatus(product),
  };
}

export async function createProduct(input, ctx = {}) {
  const name = String(input.name || '').trim();
  if (!name) throw Validation([{ path: 'name', message: 'Product name is required' }]);

  const category = await ProductCategory.findById(input.categoryId).lean();
  if (!category) throw NotFound('Category');

  validatePricing(input);

  const sku = String(input.sku || '').trim().toUpperCase();
  if (!sku) throw Validation([{ path: 'sku', message: 'SKU is required' }]);

  const stock = Number(input.stockQuantity) || 0;
  if (stock < 0) {
    throw Validation([{ path: 'stockQuantity', message: 'Stock cannot be negative' }]);
  }

  const hasVariants = Boolean(input.hasVariants) && (input.variants || []).length > 0;
  const variants = hasVariants ? normaliseVariants(input.variants, sku) : [];
  const slug = await uniqueSlug(Product, input.slug || name);

  let doc;
  try {
    doc = await Product.create({
      name,
      slug,
      sku,
      categoryId: category._id,
      brand: input.brand || '',
      shortDescription: input.shortDescription || '',
      description: input.description || '',
      sellingPricePaise: Number(input.sellingPricePaise),
      mrpPaise: Number(input.mrpPaise) || 0,
      costPricePaise: Number(input.costPricePaise) || 0,
      taxRatePct: Number(input.taxRatePct) || 0,
      trackInventory: input.trackInventory !== false,
      stockQuantity: hasVariants ? 0 : stock,
      lowStockThreshold: Number(input.lowStockThreshold ?? 5),
      hasVariants,
      variants,
      images: normaliseImages(input.images),
      memberDiscountEligible: input.memberDiscountEligible !== false,
      fulfillment: {
        pickup: input.fulfillment?.pickup !== false,
        delivery: input.fulfillment?.delivery !== false,
      },
      featured: Boolean(input.featured),
      active: input.active !== false,
      createdBy: actorLabel(ctx),
      updatedBy: actorLabel(ctx),
      isDemo: Boolean(input.isDemo),
    });
  } catch (err) {
    if (err?.code === 11000) {
      throw Conflict('DUPLICATE_SKU', 'That SKU is already used by another product or variant');
    }
    throw err;
  }

  // Opening stock gets a ledger row so the shelf history starts from zero.
  await recordOpeningStock(doc, ctx);

  await audit.record({
    actor: actorFromCtx(ctx),
    source: ctx.source || 'admin',
    action: 'product.created',
    entity: { type: 'product', id: String(doc._id), label: doc.name },
    after: { sku: doc.sku, sellingPricePaise: doc.sellingPricePaise, active: doc.active },
    requestId: ctx.requestId,
  });

  return doc.toObject();
}

async function recordOpeningStock(doc, ctx) {
  if (doc.trackInventory === false) return;
  const rows = [];
  if (doc.hasVariants) {
    for (const variant of doc.variants) {
      if (!variant.stockQuantity) continue;
      rows.push({
        productId: doc._id,
        variantId: variant._id,
        sku: variant.sku,
        productName: doc.name,
        variantName: variantLabel(variant),
        type: 'stock_in',
        quantity: variant.stockQuantity,
        quantityBefore: 0,
        quantityAfter: variant.stockQuantity,
        referenceType: 'manual',
        reason: 'Opening stock',
        createdBy: ctx?.user?.id ? String(ctx.user.id) : '',
        createdByName: actorLabel(ctx),
        source: ctx?.source || 'admin',
      });
    }
  } else if (doc.stockQuantity) {
    rows.push({
      productId: doc._id,
      variantId: null,
      sku: doc.sku,
      productName: doc.name,
      type: 'stock_in',
      quantity: doc.stockQuantity,
      quantityBefore: 0,
      quantityAfter: doc.stockQuantity,
      referenceType: 'manual',
      reason: 'Opening stock',
      createdBy: ctx?.user?.id ? String(ctx.user.id) : '',
      createdByName: actorLabel(ctx),
      source: ctx?.source || 'admin',
    });
  }
  if (rows.length) await InventoryMovement.insertMany(rows);
}

/**
 * Catalogue edits only. Stock is deliberately not writable here — it moves
 * through InventoryService so every change keeps its reason.
 */
export async function updateProduct(id, input, ctx = {}) {
  const doc = await Product.findById(id);
  if (!doc) throw NotFound('Product');

  validatePricing(input, doc.toObject());

  if (input.categoryId && String(input.categoryId) !== String(doc.categoryId)) {
    const category = await ProductCategory.findById(input.categoryId).lean();
    if (!category) throw NotFound('Category');
    doc.categoryId = category._id;
  }

  const before = {
    name: doc.name,
    sellingPricePaise: doc.sellingPricePaise,
    active: doc.active,
    featured: doc.featured,
  };

  const simple = [
    'brand',
    'shortDescription',
    'description',
    'taxRatePct',
    'memberDiscountEligible',
    'featured',
    'active',
  ];
  for (const field of simple) {
    if (input[field] !== undefined) doc[field] = input[field];
  }
  if (input.name !== undefined) doc.name = String(input.name).trim();
  if (input.sellingPricePaise !== undefined) doc.sellingPricePaise = Number(input.sellingPricePaise);
  if (input.mrpPaise !== undefined) doc.mrpPaise = Number(input.mrpPaise) || 0;
  if (input.costPricePaise !== undefined) doc.costPricePaise = Number(input.costPricePaise) || 0;
  if (input.lowStockThreshold !== undefined) {
    doc.lowStockThreshold = Number(input.lowStockThreshold) || 0;
  }
  if (input.trackInventory !== undefined) doc.trackInventory = Boolean(input.trackInventory);
  if (input.slug) doc.slug = await uniqueSlug(Product, input.slug, doc._id);
  if (input.sku) doc.sku = String(input.sku).trim().toUpperCase();
  if (input.images !== undefined) doc.images = normaliseImages(input.images);
  if (input.fulfillment) {
    doc.fulfillment = {
      pickup: input.fulfillment.pickup !== false,
      delivery: input.fulfillment.delivery !== false,
    };
  }

  if (input.variants !== undefined) {
    const incoming = normaliseVariants(input.variants, doc.sku);
    // Keep the live stock number for variants that already exist; new rows may
    // carry an opening quantity.
    const existingById = new Map((doc.variants || []).map((v) => [String(v._id), v]));
    const merged = incoming.map((v) => {
      const existing = v._id ? existingById.get(String(v._id)) : null;
      return existing ? { ...v, stockQuantity: existing.stockQuantity } : v;
    });
    doc.variants = merged;
    doc.hasVariants = merged.length > 0;
    if (doc.hasVariants) doc.stockQuantity = 0;
  } else if (input.hasVariants === false) {
    doc.hasVariants = false;
  }

  doc.updatedBy = actorLabel(ctx);

  try {
    await doc.save();
  } catch (err) {
    if (err?.code === 11000) {
      throw Conflict('DUPLICATE_SKU', 'That SKU is already used by another product or variant');
    }
    throw err;
  }

  await audit.record({
    actor: actorFromCtx(ctx),
    source: ctx.source || 'admin',
    action: 'product.updated',
    entity: { type: 'product', id: String(doc._id), label: doc.name },
    before,
    after: {
      name: doc.name,
      sellingPricePaise: doc.sellingPricePaise,
      active: doc.active,
      featured: doc.featured,
    },
    requestId: ctx.requestId,
  });

  return doc.toObject();
}

/**
 * Products are never hard-deleted — order history snapshots point at them.
 * Archiving hides the product from the shop and the admin default list.
 */
export async function setProductArchived(id, archived, ctx = {}) {
  const doc = await Product.findById(id);
  if (!doc) throw NotFound('Product');

  doc.archivedAt = archived ? new Date() : null;
  if (archived) doc.active = false;
  doc.updatedBy = actorLabel(ctx);
  await doc.save();

  await audit.record({
    actor: actorFromCtx(ctx),
    source: ctx.source || 'admin',
    action: archived ? 'product.archived' : 'product.restored',
    entity: { type: 'product', id: String(doc._id), label: doc.name },
    requestId: ctx.requestId,
  });

  return doc.toObject();
}

// ──────────────────────────── Public catalogue ────────────────────────────

export async function listPublicCategories() {
  const rows = await ProductCategory.find({ active: true })
    .sort({ sortOrder: 1, name: 1 })
    .lean();

  const counts = await Product.aggregate([
    { $match: { active: true, archivedAt: null } },
    { $group: { _id: '$categoryId', count: { $sum: 1 } } },
  ]);
  const byId = new Map(counts.map((c) => [String(c._id), c.count]));

  return rows
    .map((c) => ({
      id: String(c._id),
      name: c.name,
      slug: c.slug,
      description: c.description || '',
      image: c.image || '',
      icon: c.icon || '',
      productCount: byId.get(String(c._id)) || 0,
    }))
    .filter((c) => c.productCount > 0);
}

function toPublicCard(product, entitlements) {
  const pricing = displayPricing(product, entitlements);
  const primary =
    (product.images || []).find((i) => i.isPrimary) || (product.images || [])[0] || null;

  return {
    id: String(product._id),
    name: product.name,
    slug: product.slug,
    sku: product.sku,
    brand: product.brand || '',
    shortDescription: product.shortDescription || '',
    categoryId: String(product.categoryId?._id || product.categoryId),
    categoryName: product.categoryId?.name || '',
    categorySlug: product.categoryId?.slug || '',
    image: primary?.url || '',
    imageAlt: primary?.altText || product.name,
    featured: Boolean(product.featured),
    hasVariants: Boolean(product.hasVariants),
    stockStatus: stockStatus(product),
    stockQuantity: product.trackInventory === false ? null : availableStock(product),
    ...pricing,
  };
}

export async function listPublicProducts(query = {}, accountId = null) {
  const { entitlements } = await shopperContext(accountId);

  const filter = { active: true, archivedAt: null };

  if (query.category) {
    const category = await ProductCategory.findOne({ slug: query.category, active: true }).lean();
    if (!category) return { data: [], meta: { page: 1, pageSize: 0, total: 0 } };
    filter.categoryId = category._id;
  }
  if (query.brand) filter.brand = query.brand;
  if (query.featured === 'true') filter.featured = true;

  if (query.q) {
    const rx = new RegExp(String(query.q).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ name: rx }, { brand: rx }, { sku: rx }, { shortDescription: rx }];
  }

  const min = Number(query.minPricePaise);
  const max = Number(query.maxPricePaise);
  if (Number.isFinite(min) || Number.isFinite(max)) {
    filter.sellingPricePaise = {};
    if (Number.isFinite(min)) filter.sellingPricePaise.$gte = min;
    if (Number.isFinite(max)) filter.sellingPricePaise.$lte = max;
  }

  const sortMap = {
    featured: { featured: -1, createdAt: -1 },
    price_asc: { sellingPricePaise: 1 },
    price_desc: { sellingPricePaise: -1 },
    newest: { createdAt: -1 },
    name: { name: 1 },
  };
  const sort = sortMap[query.sort] || sortMap.featured;

  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = Math.min(Math.max(1, Number(query.pageSize) || 24), 60);

  const [rows, total] = await Promise.all([
    Product.find(filter)
      .sort(sort)
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .populate('categoryId', 'name slug')
      .lean(),
    Product.countDocuments(filter),
  ]);

  let data = rows.map((p) => toPublicCard(p, entitlements));
  if (query.availability === 'in_stock') {
    data = data.filter((p) => p.stockStatus !== 'out_of_stock');
  }

  return { data, meta: { page, pageSize, total } };
}

export async function getPublicProduct(slug, accountId = null) {
  const { entitlements } = await shopperContext(accountId);

  const product = await Product.findOne({ slug, active: true, archivedAt: null })
    .populate('categoryId', 'name slug')
    .lean();
  if (!product) throw NotFound('Product');

  const images = [...(product.images || [])].sort((a, b) => {
    if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
    return (a.sortOrder || 0) - (b.sortOrder || 0);
  });

  const variants = (product.variants || [])
    .filter((v) => v.active !== false)
    .map((v) => ({
      id: String(v._id),
      sku: v.sku,
      name: variantLabel(v),
      size: v.size || '',
      colour: v.colour || '',
      stockQuantity: product.trackInventory === false ? null : Number(v.stockQuantity) || 0,
      stockStatus: stockStatus(product, v._id),
      ...displayPricing(product, entitlements, v),
    }));

  return {
    ...toPublicCard(product, entitlements),
    description: product.description || '',
    images: images.map((i) => ({ url: i.url, altText: i.altText || product.name })),
    variants,
    fulfillment: {
      pickup: product.fulfillment?.pickup !== false,
      delivery: product.fulfillment?.delivery !== false,
    },
    lowStockThreshold: product.lowStockThreshold ?? 5,
  };
}

export async function listPublicBrands() {
  const rows = await Product.distinct('brand', { active: true, archivedAt: null });
  return rows.filter(Boolean).sort();
}

/** Admin E-commerce dashboard — every number comes from the database. */
export async function dashboard() {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [
    totalProducts,
    activeProducts,
    ordersToday,
    pendingOrders,
    revenueAgg,
    recentOrders,
    categories,
  ] = await Promise.all([
    Product.countDocuments({ archivedAt: null }),
    Product.countDocuments({ archivedAt: null, active: true }),
    Order.countDocuments({ createdAt: { $gte: startOfToday } }),
    Order.countDocuments({ orderStatus: { $in: ['pending', 'confirmed', 'processing'] } }),
    Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfToday },
          orderStatus: { $ne: 'cancelled' },
        },
      },
      { $group: { _id: null, total: { $sum: '$grandTotalPaise' } } },
    ]),
    Order.find({}).sort({ createdAt: -1 }).limit(10).lean(),
    ProductCategory.countDocuments({ active: true }),
  ]);

  const products = await Product.find({ archivedAt: null, trackInventory: true }).lean();
  let lowStock = 0;
  let outOfStock = 0;
  for (const p of products) {
    const status = stockStatus(p);
    if (status === 'low_stock') lowStock += 1;
    if (status === 'out_of_stock') outOfStock += 1;
  }

  return {
    totalProducts,
    activeProducts,
    categories,
    ordersToday,
    pendingOrders,
    revenueTodayPaise: revenueAgg[0]?.total || 0,
    lowStockProducts: lowStock,
    outOfStockProducts: outOfStock,
    recentOrders: recentOrders.map((o) => ({
      id: String(o._id),
      orderNumber: o.orderNumber,
      customerName: o.customerName,
      itemCount: (o.items || []).reduce((n, i) => n + i.quantity, 0),
      grandTotalPaise: o.grandTotalPaise,
      paymentStatus: o.paymentStatus,
      fulfillmentType: o.fulfillmentType,
      orderStatus: o.orderStatus,
      createdAt: o.createdAt,
    })),
  };
}

export default {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  setProductArchived,
  listPublicCategories,
  listPublicProducts,
  getPublicProduct,
  listPublicBrands,
  dashboard,
};
