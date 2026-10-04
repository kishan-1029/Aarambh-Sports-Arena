import mongoose from 'mongoose';
import { z } from 'zod';
import { PosCategory } from './posCategory.model.js';
import { PosProduct } from './posProduct.model.js';
import { PosOrder } from './posOrder.model.js';
import { PosCafe } from './posCafe.model.js';
import { PosCafeMenu } from './posCafeMenu.model.js';
import { nextNumber } from '../../lib/counters.js';
import { toLocalDate } from '../../lib/time.js';
import { audit } from '../audit/audit.service.js';
import { NotFound, Validation } from '../../lib/errors.js';

function oid(id) {
  if (!mongoose.isValidObjectId(id)) {
    throw Validation({ id }, 'Invalid id');
  }
  return id;
}

/* ─── Cafés ─────────────────────────────────────────────── */

export async function listCafes({ activeOnly = false } = {}) {
  const q = activeOnly ? { isActive: true } : {};
  return PosCafe.find(q).sort({ sequence: 1, name: 1 }).lean();
}

export async function upsertCafe(input) {
  const schema = z.object({
    id: z.string().optional(),
    name: z.string().min(1).max(120),
    code: z.string().min(2).max(20),
    description: z.string().max(500).optional(),
    contactNumber: z.string().max(30).optional(),
    isAcceptingOrders: z.boolean().optional(),
    isActive: z.boolean().optional(),
    sequence: z.number().int().optional(),
  });
  const body = schema.parse(input);
  const code = body.code.toUpperCase().trim();
  const payload = {
    name: body.name.trim(),
    code,
    description: body.description || '',
    contactNumber: body.contactNumber || '',
    isAcceptingOrders: body.isAcceptingOrders ?? true,
    isActive: body.isActive ?? true,
    sequence: body.sequence ?? 0,
    isDemo: true,
  };
  if (body.id) {
    oid(body.id);
    const doc = await PosCafe.findByIdAndUpdate(body.id, payload, { new: true });
    if (!doc) throw NotFound('Café');
    return doc.toObject();
  }
  const doc = await PosCafe.create(payload);
  return doc.toObject();
}

/* ─── Master catalog ────────────────────────────────────── */

export async function listProductsAdmin() {
  return PosProduct.find()
    .populate('categoryId', 'name slug station')
    .sort({ name: 1 })
    .lean();
}

export async function listCategories() {
  return PosCategory.find().sort({ sequence: 1, name: 1 }).lean();
}

export async function upsertProduct(input) {
  const schema = z.object({
    id: z.string().optional(),
    name: z.string().min(1).max(120),
    sku: z.string().max(40).optional(),
    categoryId: z.string().min(1),
    pricePaise: z.number().int().min(0),
    imageUrl: z.string().max(500).optional(),
    description: z.string().max(500).optional(),
    station: z.enum(['bar', 'kitchen', 'counter']).optional(),
    isActive: z.boolean().optional(),
  });
  const body = schema.parse(input);
  oid(body.categoryId);
  const sku =
    (body.sku || body.name).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') ||
    'item';
  const payload = {
    name: body.name.trim(),
    sku,
    categoryId: body.categoryId,
    pricePaise: body.pricePaise,
    imageUrl: body.imageUrl || '',
    description: body.description || '',
    station: body.station || 'counter',
    isActive: body.isActive ?? true,
    isDemo: true,
  };
  if (body.id) {
    oid(body.id);
    const doc = await PosProduct.findByIdAndUpdate(body.id, payload, { new: true });
    if (!doc) throw NotFound('Product');
    return doc.toObject();
  }
  const doc = await PosProduct.create(payload);
  return doc.toObject();
}

/**
 * Admin Menu Manager: all master products + this café's overlay.
 */
export async function getCafeMenuAdmin(cafeId) {
  oid(cafeId);
  const cafe = await PosCafe.findById(cafeId).lean();
  if (!cafe) throw NotFound('Café');

  const [categories, products, configs] = await Promise.all([
    PosCategory.find({ isActive: true }).sort({ sequence: 1, name: 1 }).lean(),
    PosProduct.find({ isActive: true })
      .populate('categoryId', 'name slug')
      .sort({ name: 1 })
      .lean(),
    PosCafeMenu.find({ cafeId }).lean(),
  ]);

  const byProduct = new Map(configs.map((c) => [String(c.productId), c]));
  const items = products.map((p) => {
    const cfg = byProduct.get(String(p._id));
    const basePaise = p.pricePaise;
    const custom = cfg?.customPricePaise;
    const pricePaise =
      custom != null && Number.isInteger(custom) ? custom : basePaise;
    return {
      productId: String(p._id),
      name: p.name,
      sku: p.sku,
      station: p.station,
      imageUrl: p.imageUrl || '',
      description: p.description || '',
      categoryId: p.categoryId?._id || p.categoryId,
      categoryName: p.categoryId?.name || '—',
      basePricePaise: basePaise,
      pricePaise,
      customPricePaise: custom ?? null,
      onMenu: Boolean(cfg?.onMenu),
      isSoldOut: Boolean(cfg?.isSoldOut),
      displayOrder: cfg?.displayOrder ?? 0,
      configId: cfg?._id ? String(cfg._id) : null,
    };
  });

  return { cafe, categories, items };
}

/**
 * POS terminal menu: only items onMenu && !soldOut for this café.
 */
export async function getCafeMenuPos(cafeId) {
  oid(cafeId);
  const cafe = await PosCafe.findById(cafeId).lean();
  if (!cafe) throw NotFound('Café');
  if (!cafe.isActive || !cafe.isAcceptingOrders) {
    throw Validation({ cafeId }, 'This café is not accepting orders');
  }

  const configs = await PosCafeMenu.find({
    cafeId,
    onMenu: true,
    isSoldOut: false,
  }).lean();
  if (!configs.length) {
    return { cafe, categories: [], products: [] };
  }

  const productIds = configs.map((c) => c.productId);
  const products = await PosProduct.find({
    _id: { $in: productIds },
    isActive: true,
  })
    .populate('categoryId', 'name slug sequence')
    .lean();

  const cfgByPid = new Map(configs.map((c) => [String(c.productId), c]));
  const merged = products
    .map((p) => {
      const cfg = cfgByPid.get(String(p._id));
      const custom = cfg?.customPricePaise;
      const pricePaise =
        custom != null && Number.isInteger(custom) ? custom : p.pricePaise;
      return {
        _id: p._id,
        name: p.name,
        sku: p.sku,
        station: p.station,
        imageUrl: p.imageUrl || '',
        description: p.description || '',
        categoryId: p.categoryId?._id || p.categoryId,
        categoryName: p.categoryId?.name || 'Other',
        categorySequence: p.categoryId?.sequence ?? 0,
        pricePaise,
        basePricePaise: p.pricePaise,
        isCustomPrice: custom != null,
        displayOrder: cfg?.displayOrder ?? 0,
      };
    })
    .sort(
      (a, b) =>
        a.categorySequence - b.categorySequence ||
        a.displayOrder - b.displayOrder ||
        a.name.localeCompare(b.name),
    );

  const catMap = new Map();
  for (const p of merged) {
    const key = String(p.categoryId || 'other');
    if (!catMap.has(key)) {
      catMap.set(key, {
        _id: p.categoryId,
        name: p.categoryName,
        sequence: p.categorySequence,
      });
    }
  }
  const categories = [...catMap.values()].sort((a, b) => a.sequence - b.sequence);

  return { cafe, categories, products: merged };
}

export async function upsertCafeMenuItem(cafeId, productId, patch) {
  oid(cafeId);
  oid(productId);
  const schema = z.object({
    onMenu: z.boolean().optional(),
    isSoldOut: z.boolean().optional(),
    customPricePaise: z.number().int().min(0).nullable().optional(),
    displayOrder: z.number().int().optional(),
  });
  const body = schema.parse(patch || {});

  const cafe = await PosCafe.findById(cafeId).lean();
  if (!cafe) throw NotFound('Café');
  const product = await PosProduct.findById(productId).lean();
  if (!product) throw NotFound('Product');

  const doc = await PosCafeMenu.findOneAndUpdate(
    { cafeId, productId },
    {
      $set: {
        cafeId,
        productId,
        isDemo: true,
        onMenu: body.onMenu ?? true,
        isSoldOut: body.isSoldOut ?? false,
        ...(body.customPricePaise !== undefined
          ? { customPricePaise: body.customPricePaise }
          : {}),
        ...(body.displayOrder !== undefined ? { displayOrder: body.displayOrder } : {}),
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  return doc.toObject();
}

/* ─── Orders ────────────────────────────────────────────── */

const paySchema = z.object({
  cafeId: z.string().min(1),
  clientOrderId: z.string().min(8).max(80),
  paymentMethod: z.enum(['cash', 'card', 'upi', 'other']).default('cash'),
  orderType: z.enum(['dine-in', 'takeaway', 'counter']).default('counter'),
  note: z.string().max(500).optional(),
  guestLabel: z.string().max(120).optional(),
  lines: z
    .array(
      z.object({
        productId: z.string().min(1),
        qty: z.number().int().min(1).max(99),
      }),
    )
    .min(1)
    .max(50),
});

export async function createPaidOrder(input, ctx = {}) {
  const body = paySchema.parse(input);
  oid(body.cafeId);

  const existing = await PosOrder.findOne({ clientOrderId: body.clientOrderId }).lean();
  if (existing) return existing;

  const cafe = await PosCafe.findById(body.cafeId).lean();
  if (!cafe || !cafe.isActive || !cafe.isAcceptingOrders) {
    throw Validation({ cafeId: body.cafeId }, 'Café not accepting orders');
  }

  const menu = await getCafeMenuPos(body.cafeId);
  const sellable = new Map(menu.products.map((p) => [String(p._id), p]));

  const lines = [];
  let subtotalPaise = 0;
  for (const line of body.lines) {
    const p = sellable.get(String(line.productId));
    if (!p) {
      throw Validation(
        { productId: line.productId },
        'Item is not on this café menu (or sold out)',
      );
    }
    const unitPaise = Number(p.pricePaise);
    const linePaise = unitPaise * line.qty;
    subtotalPaise += linePaise;
    lines.push({
      productId: p._id,
      name: p.name,
      qty: line.qty,
      unitPaise,
      linePaise,
      station: p.station || 'counter',
    });
  }

  const number = await nextNumber(
    `pos:${cafe.code}:${toLocalDate(new Date())}`,
    'POS-{YYYY}{SEQ:4}',
  );
  let order;
  try {
    order = await PosOrder.create({
      number,
      clientOrderId: body.clientOrderId,
      cafeId: cafe._id,
      cafeName: cafe.name,
      cafeCode: cafe.code,
      lines,
      subtotalPaise,
      totalPaise: subtotalPaise,
      status: 'paid',
      paymentMethod: body.paymentMethod,
      orderType: body.orderType || 'counter',
      localDate: toLocalDate(new Date()),
      note: body.note || '',
      guestLabel: body.guestLabel || '',
      createdBy: ctx.user?.id || ctx.user?.email || '',
      isDemo: true,
    });
  } catch (err) {
    if (err?.code === 11000) {
      const again = await PosOrder.findOne({ clientOrderId: body.clientOrderId }).lean();
      if (again) return again;
    }
    throw err;
  }

  try {
    await audit.record({
      actor: {
        type: 'staff',
        id: ctx.user?.id,
        name: ctx.user?.name || ctx.user?.email,
      },
      source: 'admin',
      action: 'pos.order.paid',
      entity: { type: 'posOrder', id: String(order._id), label: order.number },
      after: {
        cafeCode: cafe.code,
        totalPaise: order.totalPaise,
        paymentMethod: order.paymentMethod,
        lineCount: order.lines.length,
      },
      requestId: ctx.requestId,
    });
  } catch {
    /* audit best-effort */
  }

  return order.toObject();
}

export async function listTodaysOrders(cafeId) {
  const q = { localDate: toLocalDate(new Date()), status: 'paid' };
  if (cafeId) {
    oid(cafeId);
    q.cafeId = cafeId;
  }
  return PosOrder.find(q).sort({ createdAt: -1 }).limit(50).lean();
}

/** @deprecated use getCafeMenuPos */
export async function listCatalog() {
  const cafes = await listCafes({ activeOnly: true });
  if (!cafes.length) return { categories: [], products: [], cafes: [] };
  const menu = await getCafeMenuPos(String(cafes[0]._id));
  return { ...menu, cafes };
}
