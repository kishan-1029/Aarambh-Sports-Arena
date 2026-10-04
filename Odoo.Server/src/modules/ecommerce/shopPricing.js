/**
 * Authoritative shop pricing. The browser only ever sends identifiers and
 * quantities; every paise shown on an order is computed here from the
 * catalogue and the member's real entitlements.
 */
import { PortalAccount } from '../portal/portalAccount.model.js';
import { Member } from '../members/member.model.js';
import { entitlementsFor, shopDiscountPct } from '../membership/entitlements.js';
import { getClubSettings } from '../settings/settings.service.js';
import { computeLine, pct } from '../../lib/money.js';
import { variantLabel } from './inventory.service.js';

/**
 * Resolve who is shopping and what they are entitled to. An expired, cancelled
 * or missing membership simply yields a 0% discount — entitlementsFor() only
 * returns a snapshot while the membership is active and in date.
 */
export async function shopperContext(accountId) {
  const guest = {
    account: null,
    member: null,
    entitlements: null,
    tierKey: 'none',
    planKey: '',
    memberDiscountPct: 0,
  };
  if (!accountId) return guest;

  const account = await PortalAccount.findById(accountId).lean();
  if (!account) return guest;

  const member = account.memberId ? await Member.findById(account.memberId).lean() : null;
  if (!member) return { ...guest, account };

  const entitlements = await entitlementsFor(member._id);
  return {
    account,
    member,
    entitlements,
    tierKey: member.tierKey || 'none',
    planKey: entitlements?.planKey || '',
    memberDiscountPct: Number(entitlements?.shopDiscountPct) || 0,
  };
}

export function resolveVariant(product, variantId) {
  if (!variantId) return null;
  return (product.variants || []).find((v) => String(v._id) === String(variantId)) || null;
}

/** Base price of one unit, before any member discount. */
export function unitPricePaise(product, variant = null) {
  const base = Number(product.sellingPricePaise) || 0;
  return base + (variant ? Number(variant.additionalPricePaise) || 0 : 0);
}

/**
 * What a shopper sees on a card or product page.
 * @param {object} product
 * @param {object|null} entitlements
 * @param {object|null} variant
 */
export function displayPricing(product, entitlements = null, variant = null) {
  const unit = unitPricePaise(product, variant);
  const discountPct = shopDiscountPct(entitlements, product);
  const discountPaise = discountPct > 0 ? pct(unit, discountPct) : 0;
  const mrp = Number(product.mrpPaise) || 0;

  return {
    pricePaise: unit,
    mrpPaise: mrp > unit ? mrp : 0,
    mrpDiscountPct: mrp > unit ? Math.round(((mrp - unit) / mrp) * 100) : 0,
    memberDiscountPct: discountPct,
    memberPricePaise: unit - discountPaise,
    memberSavingPaise: discountPaise,
    memberDiscountEligible: product.memberDiscountEligible !== false,
    taxRatePct: Number(product.taxRatePct) || 0,
  };
}

/**
 * One priced order line. Tax is applied after the member discount so a member
 * is never taxed on money they did not pay.
 */
export function priceLine({ product, variant, quantity, entitlements }) {
  const unit = unitPricePaise(product, variant);
  const discountPct = shopDiscountPct(entitlements, product);
  const taxRatePct = Number(product.taxRatePct) || 0;

  const line = computeLine({
    unitPricePaise: unit,
    qty: quantity,
    discountPct,
    tax: taxRatePct > 0 ? [{ name: 'GST', ratePct: taxRatePct }] : [],
  });

  const primaryImage =
    (product.images || []).find((i) => i.isPrimary)?.url || (product.images || [])[0]?.url || '';

  return {
    productId: product._id,
    variantId: variant ? variant._id : null,
    productNameSnapshot: product.name,
    variantNameSnapshot: variant ? variantLabel(variant) : '',
    skuSnapshot: variant ? variant.sku : product.sku,
    imageSnapshot: primaryImage,
    slugSnapshot: product.slug,
    quantity,
    unitPricePaise: unit,
    mrpPaise: Number(product.mrpPaise) || 0,
    memberDiscountPct: discountPct,
    discountPaise: line.discountPaise,
    taxRatePct,
    taxPaise: line.taxPaise,
    lineTotalPaise: line.totalPaise,
  };
}

/**
 * Delivery charge from club settings — never from the browser.
 * @param {{ fulfillmentType: string, netPaise: number }} args
 */
export async function deliveryChargePaise({ fulfillmentType, netPaise }) {
  if (fulfillmentType !== 'delivery') return 0;
  const settings = await getClubSettings(null);
  const charge = Number(settings.shopDeliveryChargePaise ?? 8000);
  const freeAbove = Number(settings.shopFreeDeliveryAbovePaise ?? 0);
  if (freeAbove > 0 && netPaise >= freeAbove) return 0;
  return charge;
}

/** Sum priced lines into the totals the customer and the order both see. */
export function totalsFromLines(lines, deliveryPaise = 0) {
  const subtotalPaise = lines.reduce((sum, l) => sum + l.unitPricePaise * l.quantity, 0);
  const discountPaise = lines.reduce((sum, l) => sum + l.discountPaise, 0);
  const taxPaise = lines.reduce((sum, l) => sum + l.taxPaise, 0);
  const netPaise = subtotalPaise - discountPaise;
  return {
    subtotalPaise,
    discountPaise,
    taxPaise,
    netPaise,
    deliveryChargePaise: deliveryPaise,
    grandTotalPaise: netPaise + taxPaise + deliveryPaise,
  };
}

export default {
  shopperContext,
  resolveVariant,
  unitPricePaise,
  displayPricing,
  priceLine,
  deliveryChargePaise,
  totalsFromLines,
};
