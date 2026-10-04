import { Order, ORDER_STATUSES } from './order.model.js';
import { Product } from './product.model.js';
import { Cart } from './cart.model.js';
import { PortalAccount } from '../portal/portalAccount.model.js';
import { Member } from '../members/member.model.js';
import { getClubSettings } from '../settings/settings.service.js';
import { withTransaction } from '../../lib/db.js';
import { nextNumber } from '../../lib/counters.js';
import { Conflict, NotFound, Unauthorized, Validation } from '../../lib/errors.js';
import { parseListQuery, runListQuery } from '../../lib/listQuery.js';
import { audit } from '../audit/audit.service.js';
import * as InventoryService from './inventory.service.js';
import {
  deliveryChargePaise,
  priceLine,
  resolveVariant,
  shopperContext,
  totalsFromLines,
} from './shopPricing.js';

const PICKUP_LOCATION = 'Aarambh Sports Arena, Vadodara, Gujarat';

/**
 * Backend owns the state machine. The admin dropdown only ever offers what
 * allowedNextStatuses() returns, and the service re-checks on every write.
 */
const TRANSITIONS = {
  pending: { pickup: ['confirmed', 'cancelled'], delivery: ['confirmed', 'cancelled'] },
  confirmed: { pickup: ['processing', 'cancelled'], delivery: ['processing', 'cancelled'] },
  processing: {
    pickup: ['ready_for_pickup', 'cancelled'],
    delivery: ['out_for_delivery', 'cancelled'],
  },
  ready_for_pickup: { pickup: ['completed', 'cancelled'], delivery: [] },
  out_for_delivery: { pickup: [], delivery: ['delivered'] },
  delivered: { pickup: [], delivery: ['completed'] },
  completed: { pickup: [], delivery: [] },
  cancelled: { pickup: [], delivery: [] },
};

/** Before the club has started picking the order, stock can still be released. */
const CUSTOMER_CANCELLABLE = new Set(['pending', 'confirmed']);
const STOCK_HELD_STATUSES = new Set([
  'pending',
  'confirmed',
  'processing',
  'ready_for_pickup',
  'out_for_delivery',
]);

export function allowedNextStatuses(order) {
  return TRANSITIONS[order.orderStatus]?.[order.fulfillmentType] || [];
}

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

function requireDeliveryAddress(address) {
  const required = [
    ['fullName', 'Full name'],
    ['phone', 'Phone'],
    ['line1', 'Address line 1'],
    ['city', 'City'],
    ['state', 'State'],
    ['postalCode', 'Postal code'],
  ];
  const issues = [];
  for (const [field, label] of required) {
    if (!address?.[field] || !String(address[field]).trim()) {
      issues.push({ path: `deliveryAddress.${field}`, message: `${label} is required` });
    }
  }
  if (address?.postalCode && !/^\d{6}$/.test(String(address.postalCode).trim())) {
    issues.push({ path: 'deliveryAddress.postalCode', message: 'Enter a 6-digit postal code' });
  }
  if (issues.length) throw Validation(issues);
}

/**
 * Create an order from the signed-in cart.
 *
 * Everything that must not half-happen runs in one transaction: price, order,
 * lines, stock deduction, ledger rows and emptying the cart. A shortage on any
 * line rolls the whole thing back.
 */
export async function checkout(
  { accountId, fulfillmentType, paymentMethod, deliveryAddress = null, customerNote = '', contact = {} },
  ctx = {},
) {
  if (!['pickup', 'delivery'].includes(fulfillmentType)) {
    throw Validation([{ path: 'fulfillmentType', message: 'Choose club pickup or delivery' }]);
  }

  const account = await PortalAccount.findById(accountId).lean();
  if (!account) throw Unauthorized('Please sign in to place an order');

  const settings = await getClubSettings(null);
  const methods = allowedPaymentMethods(fulfillmentType, settings);
  if (!methods.includes(paymentMethod)) {
    throw Validation([
      { path: 'paymentMethod', message: 'That payment method is not available for this order' },
    ]);
  }

  if (fulfillmentType === 'delivery') requireDeliveryAddress(deliveryAddress);

  const cart = await Cart.findOne({ accountId }).lean();
  if (!cart || !cart.items.length) {
    throw Validation([{ path: 'cart', message: 'Your cart is empty' }]);
  }

  const { member, entitlements, tierKey, planKey, memberDiscountPct } =
    await shopperContext(accountId);

  const customerName = String(contact.name || account.name || '').trim();
  const customerPhone = String(contact.phone || account.phone || '').trim();
  const customerEmail = String(contact.email || account.email || '').trim();
  if (!customerName) throw Validation([{ path: 'contact.name', message: 'Name is required' }]);
  if (!customerPhone) throw Validation([{ path: 'contact.phone', message: 'Mobile number is required' }]);

  const created = await withTransaction(async (session) => {
    const products = await Product.find({ _id: { $in: cart.items.map((i) => i.productId) } })
      .session(session)
      .lean();
    const byId = new Map(products.map((p) => [String(p._id), p]));

    const lines = [];
    const movements = [];

    for (const item of cart.items) {
      const product = byId.get(String(item.productId));
      if (!product || product.active === false || product.archivedAt) {
        throw Conflict('PRODUCT_UNAVAILABLE', 'An item in your cart is no longer available', {
          productId: String(item.productId),
        });
      }

      const variant = resolveVariant(product, item.variantId);
      if (item.variantId && (!variant || variant.active === false)) {
        throw Conflict('VARIANT_UNAVAILABLE', `The chosen option for ${product.name} is unavailable`, {
          productId: String(product._id),
        });
      }
      if (product.hasVariants && !variant) {
        throw Conflict('VARIANT_REQUIRED', `${product.name} needs an option selected`, {
          productId: String(product._id),
        });
      }

      const canFulfil =
        fulfillmentType === 'pickup'
          ? product.fulfillment?.pickup !== false
          : product.fulfillment?.delivery !== false;
      if (!canFulfil) {
        throw Conflict(
          'FULFILMENT_UNAVAILABLE',
          `${product.name} is not available for ${fulfillmentType === 'pickup' ? 'club pickup' : 'delivery'}`,
          { productId: String(product._id) },
        );
      }

      lines.push(priceLine({ product, variant, quantity: item.quantity, entitlements }));
      movements.push({
        productId: product._id,
        variantId: variant ? variant._id : null,
        qty: -item.quantity,
      });
    }

    const draftTotals = totalsFromLines(lines, 0);
    const delivery = await deliveryChargePaise({
      fulfillmentType,
      netPaise: draftTotals.netPaise,
    });
    const totals = totalsFromLines(lines, delivery);

    const year = new Date().getFullYear();
    const orderNumber = await nextNumber(`shop_order:${year}`, 'ASA-ORD-{YYYY}-{SEQ:6}', {
      session,
    });

    const [order] = await Order.create(
      [
        {
          orderNumber,
          accountId: account._id,
          memberId: member?._id || null,
          customerId: account.customerId || member?.customerId || null,
          customerName,
          customerEmail,
          customerPhone,
          membershipTierKey: tierKey,
          membershipPlanKey: planKey,
          memberDiscountPct,
          fulfillmentType,
          deliveryAddress: fulfillmentType === 'delivery' ? deliveryAddress : null,
          pickupLocation: fulfillmentType === 'pickup' ? PICKUP_LOCATION : '',
          items: lines,
          subtotalPaise: totals.subtotalPaise,
          discountPaise: totals.discountPaise,
          taxPaise: totals.taxPaise,
          deliveryChargePaise: totals.deliveryChargePaise,
          grandTotalPaise: totals.grandTotalPaise,
          paymentMethod,
          paymentStatus: 'pending',
          orderStatus: 'pending',
          statusHistory: [
            { status: 'pending', at: new Date(), byName: customerName, note: 'Order placed' },
          ],
          stockDeducted: true,
          customerNote: String(customerNote || '').slice(0, 1000),
          source: ctx.source || 'website',
          createdBy: customerName,
        },
      ],
      { session },
    );

    // One shelf: the same move() the counter will use.
    for (const m of movements) {
      await InventoryService.move(session, {
        ...m,
        type: 'sale',
        referenceType: 'order',
        referenceId: String(order._id),
        referenceLabel: order.orderNumber,
        reason: 'Online order',
        ctx: { ...ctx, user: { id: String(account._id), name: customerName }, source: 'website' },
      });
    }

    await Cart.updateOne({ accountId }, { $set: { items: [] } }, { session });

    return order;
  });

  await audit.record({
    actor: { type: 'user', id: String(account._id), name: customerName },
    source: ctx.source || 'website',
    action: 'shop_order.created',
    entity: { type: 'shopOrder', id: String(created._id), label: created.orderNumber },
    after: {
      grandTotalPaise: created.grandTotalPaise,
      fulfillmentType: created.fulfillmentType,
      paymentMethod: created.paymentMethod,
      itemCount: created.items.length,
    },
    requestId: ctx.requestId,
  });

  return toCustomerOrder(created.toObject());
}

/** Which methods make sense right now — no gateway means no "paid" shortcut. */
export function allowedPaymentMethods(fulfillmentType, settings = {}) {
  const gatewayLive = settings.paymentsProvider && settings.paymentsProvider !== 'mock';
  const methods = [];
  if (gatewayLive) methods.push('online', 'upi', 'card');
  if (fulfillmentType === 'pickup') methods.push('pay_at_club');
  else methods.push('cash_on_delivery');
  return methods;
}

export async function paymentOptions(fulfillmentType) {
  const settings = await getClubSettings(null);
  return {
    methods: allowedPaymentMethods(fulfillmentType, settings),
    gatewayLive: Boolean(settings.paymentsProvider && settings.paymentsProvider !== 'mock'),
    deliveryChargePaise: Number(settings.shopDeliveryChargePaise ?? 8000),
    freeDeliveryAbovePaise: Number(settings.shopFreeDeliveryAbovePaise ?? 0),
    pickupLocation: PICKUP_LOCATION,
  };
}

/**
 * Quote the cart for the checkout screen. Same code path as checkout() so the
 * number the customer sees is the number the order gets.
 */
export async function quoteCheckout({ accountId, fulfillmentType = 'pickup' }) {
  const cart = await Cart.findOne({ accountId }).lean();
  const { entitlements, tierKey, memberDiscountPct } = await shopperContext(accountId);

  if (!cart || !cart.items.length) {
    return {
      items: [],
      totals: totalsFromLines([], 0),
      memberDiscountPct,
      tierKey,
      ...(await paymentOptions(fulfillmentType)),
    };
  }

  const products = await Product.find({ _id: { $in: cart.items.map((i) => i.productId) } }).lean();
  const byId = new Map(products.map((p) => [String(p._id), p]));

  const lines = [];
  for (const item of cart.items) {
    const product = byId.get(String(item.productId));
    if (!product || product.active === false || product.archivedAt) continue;
    const variant = resolveVariant(product, item.variantId);
    lines.push(priceLine({ product, variant, quantity: item.quantity, entitlements }));
  }

  const draft = totalsFromLines(lines, 0);
  const delivery = await deliveryChargePaise({ fulfillmentType, netPaise: draft.netPaise });

  return {
    items: lines.map((l) => ({
      productId: String(l.productId),
      variantId: l.variantId ? String(l.variantId) : null,
      name: l.productNameSnapshot,
      variantName: l.variantNameSnapshot,
      image: l.imageSnapshot,
      quantity: l.quantity,
      unitPricePaise: l.unitPricePaise,
      discountPaise: l.discountPaise,
      lineTotalPaise: l.lineTotalPaise,
    })),
    totals: totalsFromLines(lines, delivery),
    memberDiscountPct,
    tierKey,
    ...(await paymentOptions(fulfillmentType)),
  };
}

// ──────────────────────────── Status changes ────────────────────────────

export async function updateStatus(orderId, { status, note = '' }, ctx = {}) {
  if (!ORDER_STATUSES.includes(status)) {
    throw Validation([{ path: 'status', message: `Unknown status ${status}` }]);
  }

  const order = await Order.findById(orderId);
  if (!order) throw NotFound('Order');

  if (status === 'cancelled') {
    return cancel(orderId, { reason: note || 'Cancelled by club' }, ctx);
  }

  const allowed = allowedNextStatuses(order);
  if (!allowed.includes(status)) {
    throw Conflict(
      'INVALID_TRANSITION',
      `${order.orderNumber} cannot move from ${order.orderStatus} to ${status}`,
      { from: order.orderStatus, to: status, allowed },
    );
  }

  const before = order.orderStatus;
  order.orderStatus = status;
  order.statusHistory.push({
    status,
    at: new Date(),
    byId: ctx?.user?.id ? String(ctx.user.id) : '',
    byName: actorLabel(ctx),
    note,
  });

  // Handing goods over at the counter settles a pay-at-club order.
  if (
    (status === 'completed' || status === 'delivered') &&
    order.paymentStatus === 'pending' &&
    ['pay_at_club', 'cash_on_delivery'].includes(order.paymentMethod)
  ) {
    order.paymentStatus = 'paid';
    order.paidAmountPaise = order.grandTotalPaise;
    order.paymentDate = new Date();
  }

  order.updatedBy = actorLabel(ctx);
  await order.save();

  await audit.record({
    actor: actorFromCtx(ctx),
    source: ctx.source || 'admin',
    action: 'shop_order.status_changed',
    entity: { type: 'shopOrder', id: String(order._id), label: order.orderNumber },
    before: { orderStatus: before },
    after: { orderStatus: status, note },
    requestId: ctx.requestId,
  });

  return toAdminOrder(order.toObject());
}

export async function recordPayment(orderId, { status, reference = '', amountPaise }, ctx = {}) {
  const order = await Order.findById(orderId);
  if (!order) throw NotFound('Order');

  const before = { paymentStatus: order.paymentStatus, paidAmountPaise: order.paidAmountPaise };

  order.paymentStatus = status;
  order.paymentReference = reference || order.paymentReference;
  if (status === 'paid') {
    order.paidAmountPaise = amountPaise != null ? Number(amountPaise) : order.grandTotalPaise;
    order.paymentDate = new Date();
  }
  if (status === 'refunded') order.paidAmountPaise = 0;
  order.updatedBy = actorLabel(ctx);
  await order.save();

  await audit.record({
    actor: actorFromCtx(ctx),
    source: ctx.source || 'admin',
    action: 'shop_order.payment_recorded',
    entity: { type: 'shopOrder', id: String(order._id), label: order.orderNumber },
    before,
    after: { paymentStatus: order.paymentStatus, paidAmountPaise: order.paidAmountPaise },
    requestId: ctx.requestId,
  });

  return toAdminOrder(order.toObject());
}

/**
 * Cancel and put the goods back on the shelf. The `stockRestored` flag is
 * flipped inside the transaction with a guarded update, so a double-click or a
 * retried request can never credit stock twice.
 */
export async function cancel(orderId, { reason = '' } = {}, ctx = {}, opts = {}) {
  const existing = await Order.findById(orderId).lean();
  if (!existing) throw NotFound('Order');

  if (opts.accountId && String(existing.accountId) !== String(opts.accountId)) {
    throw Unauthorized('You do not have permission to cancel this order');
  }

  if (existing.orderStatus === 'cancelled') {
    return opts.accountId ? toCustomerOrder(existing) : toAdminOrder(existing);
  }

  const cancellable = opts.accountId
    ? CUSTOMER_CANCELLABLE.has(existing.orderStatus)
    : STOCK_HELD_STATUSES.has(existing.orderStatus) && existing.orderStatus !== 'out_for_delivery';

  if (!cancellable) {
    throw Conflict(
      'NOT_CANCELLABLE',
      `${existing.orderNumber} can no longer be cancelled (${existing.orderStatus.replace(/_/g, ' ')})`,
      { orderStatus: existing.orderStatus },
    );
  }

  const byName = opts.accountId ? existing.customerName : actorLabel(ctx);

  const updated = await withTransaction(async (session) => {
    const claimed = await Order.findOneAndUpdate(
      { _id: orderId, orderStatus: { $ne: 'cancelled' } },
      {
        $set: {
          orderStatus: 'cancelled',
          cancelledAt: new Date(),
          cancelReason: String(reason || '').slice(0, 500),
          updatedBy: byName,
          ...(existing.paymentStatus === 'paid' ? { paymentStatus: 'refunded' } : {}),
        },
        $push: {
          statusHistory: {
            status: 'cancelled',
            at: new Date(),
            byId: ctx?.user?.id ? String(ctx.user.id) : '',
            byName,
            note: reason || '',
          },
        },
      },
      { new: true, session },
    );
    if (!claimed) throw Conflict('NOT_CANCELLABLE', 'Order was already cancelled');

    // Only the request that flips stockRestored false→true puts stock back.
    const toRestore = await Order.findOneAndUpdate(
      { _id: orderId, stockDeducted: true, stockRestored: false },
      { $set: { stockRestored: true } },
      { new: false, session },
    );

    if (toRestore) {
      for (const item of toRestore.items) {
        await InventoryService.move(session, {
          productId: item.productId,
          variantId: item.variantId || null,
          qty: item.quantity,
          type: 'cancellation',
          referenceType: 'order',
          referenceId: String(orderId),
          referenceLabel: toRestore.orderNumber,
          reason: reason || 'Order cancelled',
          ctx,
        });
      }
    }

    return claimed;
  });

  await audit.record({
    actor: opts.accountId
      ? { type: 'user', id: String(opts.accountId), name: existing.customerName }
      : actorFromCtx(ctx),
    source: ctx.source || (opts.accountId ? 'website' : 'admin'),
    action: 'shop_order.cancelled',
    entity: { type: 'shopOrder', id: String(updated._id), label: updated.orderNumber },
    before: { orderStatus: existing.orderStatus },
    after: { orderStatus: 'cancelled', reason },
    reason,
    requestId: ctx.requestId,
  });

  return opts.accountId ? toCustomerOrder(updated.toObject()) : toAdminOrder(updated.toObject());
}

export async function setAdminNote(orderId, note, ctx = {}) {
  const order = await Order.findByIdAndUpdate(
    orderId,
    { $set: { adminNote: String(note || '').slice(0, 2000), updatedBy: actorLabel(ctx) } },
    { new: true },
  );
  if (!order) throw NotFound('Order');
  return toAdminOrder(order.toObject());
}

// ──────────────────────────── Reads ────────────────────────────

export async function listOrders(req) {
  const parsed = parseListQuery(req, {
    allowedSort: ['createdAt', '-createdAt', 'grandTotalPaise', '-grandTotalPaise'],
    defaultSort: '-createdAt',
    defaultPageSize: 25,
    searchFields: ['orderNumber', 'customerName', 'customerPhone', 'customerEmail'],
    buildFilter: (q) => {
      const filter = {};
      if (q.orderStatus) filter.orderStatus = q.orderStatus;
      if (q.paymentStatus) filter.paymentStatus = q.paymentStatus;
      if (q.fulfillmentType) filter.fulfillmentType = q.fulfillmentType;
      if (q.memberId) filter.memberId = q.memberId;
      if (q.from || q.to) {
        filter.createdAt = {};
        if (q.from) filter.createdAt.$gte = new Date(`${q.from}T00:00:00+05:30`);
        if (q.to) filter.createdAt.$lte = new Date(`${q.to}T23:59:59+05:30`);
      }
      return filter;
    },
  });

  const result = await runListQuery(Order, parsed, { lean: true });
  return { ...result, data: result.data.map(toAdminOrder) };
}

export async function getOrder(id) {
  const order = await Order.findById(id).lean();
  if (!order) throw NotFound('Order');

  let membership = null;
  if (order.memberId) {
    const member = await Member.findById(order.memberId)
      .select('memberCode firstName lastName tierKey status membershipEndDate')
      .lean();
    if (member) {
      membership = {
        memberId: String(member._id),
        memberCode: member.memberCode,
        name: `${member.firstName || ''} ${member.lastName || ''}`.trim(),
        tierKey: member.tierKey,
        status: member.status,
        membershipEndDate: member.membershipEndDate,
      };
    }
  }

  return { ...toAdminOrder(order), member: membership, allowedNextStatuses: allowedNextStatuses(order) };
}

export async function listMyOrders(accountId) {
  const rows = await Order.find({ accountId }).sort({ createdAt: -1 }).limit(100).lean();
  return rows.map(toCustomerOrder);
}

export async function getMyOrder(accountId, orderNumber) {
  const order = await Order.findOne({ orderNumber }).lean();
  if (!order) throw NotFound('Order');
  if (String(order.accountId) !== String(accountId)) {
    // Do not leak whether somebody else's order number exists.
    throw NotFound('Order');
  }
  return { ...toCustomerOrder(order), items: order.items.map(toCustomerItem) };
}

function toCustomerItem(item) {
  return {
    productId: String(item.productId),
    variantId: item.variantId ? String(item.variantId) : null,
    name: item.productNameSnapshot,
    variantName: item.variantNameSnapshot,
    sku: item.skuSnapshot,
    slug: item.slugSnapshot,
    image: item.imageSnapshot,
    quantity: item.quantity,
    unitPricePaise: item.unitPricePaise,
    discountPaise: item.discountPaise,
    taxPaise: item.taxPaise,
    lineTotalPaise: item.lineTotalPaise,
  };
}

function toCustomerOrder(order) {
  return {
    id: String(order._id),
    orderNumber: order.orderNumber,
    orderStatus: order.orderStatus,
    paymentStatus: order.paymentStatus,
    paymentMethod: order.paymentMethod,
    fulfillmentType: order.fulfillmentType,
    pickupLocation: order.pickupLocation || '',
    deliveryAddress: order.deliveryAddress || null,
    itemCount: (order.items || []).reduce((n, i) => n + i.quantity, 0),
    items: (order.items || []).map(toCustomerItem),
    subtotalPaise: order.subtotalPaise,
    discountPaise: order.discountPaise,
    taxPaise: order.taxPaise,
    deliveryChargePaise: order.deliveryChargePaise,
    grandTotalPaise: order.grandTotalPaise,
    memberDiscountPct: order.memberDiscountPct,
    membershipTierKey: order.membershipTierKey,
    customerNote: order.customerNote || '',
    cancelReason: order.cancelReason || '',
    canCancel: CUSTOMER_CANCELLABLE.has(order.orderStatus),
    timeline: (order.statusHistory || []).map((s) => ({
      status: s.status,
      at: s.at,
      note: s.note || '',
    })),
    createdAt: order.createdAt,
  };
}

function toAdminOrder(order) {
  return {
    _id: String(order._id),
    id: String(order._id),
    orderNumber: order.orderNumber,
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    customerPhone: order.customerPhone,
    memberId: order.memberId ? String(order.memberId) : null,
    membershipTierKey: order.membershipTierKey,
    memberDiscountPct: order.memberDiscountPct,
    fulfillmentType: order.fulfillmentType,
    deliveryAddress: order.deliveryAddress || null,
    pickupLocation: order.pickupLocation || '',
    items: (order.items || []).map((i) => ({
      productId: String(i.productId),
      variantId: i.variantId ? String(i.variantId) : null,
      name: i.productNameSnapshot,
      variantName: i.variantNameSnapshot,
      sku: i.skuSnapshot,
      image: i.imageSnapshot,
      quantity: i.quantity,
      unitPricePaise: i.unitPricePaise,
      mrpPaise: i.mrpPaise,
      memberDiscountPct: i.memberDiscountPct,
      discountPaise: i.discountPaise,
      taxRatePct: i.taxRatePct,
      taxPaise: i.taxPaise,
      lineTotalPaise: i.lineTotalPaise,
    })),
    itemCount: (order.items || []).reduce((n, i) => n + i.quantity, 0),
    subtotalPaise: order.subtotalPaise,
    discountPaise: order.discountPaise,
    taxPaise: order.taxPaise,
    deliveryChargePaise: order.deliveryChargePaise,
    grandTotalPaise: order.grandTotalPaise,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    paymentReference: order.paymentReference || '',
    paidAmountPaise: order.paidAmountPaise,
    paymentDate: order.paymentDate,
    orderStatus: order.orderStatus,
    statusHistory: order.statusHistory || [],
    customerNote: order.customerNote || '',
    adminNote: order.adminNote || '',
    cancelReason: order.cancelReason || '',
    stockRestored: Boolean(order.stockRestored),
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}

export default {
  checkout,
  quoteCheckout,
  paymentOptions,
  allowedPaymentMethods,
  allowedNextStatuses,
  updateStatus,
  recordPayment,
  cancel,
  setAdminNote,
  listOrders,
  getOrder,
  listMyOrders,
  getMyOrder,
};
