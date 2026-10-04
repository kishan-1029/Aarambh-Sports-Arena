/** Human labels for invoice / payment channel bifurcation (POS vs E-com vs club). */

export function invoiceChannel(sourceType) {
  switch (sourceType) {
    case "order":
      return { key: "ecom", label: "E-com", tone: "info" };
    case "pos_order":
      return { key: "pos", label: "POS", tone: "pending" };
    case "membership":
      return { key: "membership", label: "Membership", tone: "active" };
    case "booking":
      return { key: "booking", label: "Booking", tone: "info" };
    case "quote":
      return { key: "quote", label: "Quote", tone: "neutral" };
    case "manual":
      return { key: "manual", label: "Manual", tone: "neutral" };
    default:
      return { key: sourceType || "other", label: sourceType || "Other", tone: "neutral" };
  }
}

export function paymentChannel(payment) {
  if (payment?.posSessionId) {
    return { key: "pos", label: "POS", tone: "pending" };
  }
  const inv = Array.isArray(payment?.invoiceIds) ? payment.invoiceIds[0] : null;
  if (inv?.sourceType) return invoiceChannel(inv.sourceType);
  if (payment?.sourceType === "shop_order") {
    return { key: "ecom", label: "E-com", tone: "info" };
  }
  return { key: "other", label: "Finance", tone: "neutral" };
}

export function customerChannelTags(tags = []) {
  const set = new Set((tags || []).map((t) => String(t).toLowerCase()));
  const out = [];
  if (set.has("ecom") || set.has("shop")) out.push({ key: "ecom", label: "E-com", tone: "info" });
  if (set.has("pos") || set.has("walk-in")) out.push({ key: "pos", label: "POS", tone: "pending" });
  if (set.has("member") || set.has("portal")) out.push({ key: "member", label: "Member", tone: "active" });
  if (set.has("website") || set.has("lead")) out.push({ key: "web", label: "Website", tone: "neutral" });
  return out;
}
