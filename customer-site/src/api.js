// Prod single-domain: VITE_API_URL="" → same origin (/api/...)
const API =
  import.meta.env.VITE_API_URL !== undefined && import.meta.env.VITE_API_URL !== ''
    ? import.meta.env.VITE_API_URL.replace(/\/$/, '')
    : import.meta.env.PROD
      ? ''
      : 'http://localhost:7002';

export function mediaUrl(path) {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  const clean = String(path).replace(/^\/+/, '');
  return API ? `${API}/${clean}` : `/${clean}`;
}

export const TOKEN_KEY = 'aarambh_portal_token';

export function getAuthToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(token) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {}
}

export function clearAuthToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {}
}

export function hasAuthToken() {
  return Boolean(getAuthToken());
}

function authHeaders() {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(path, { method = 'GET', body, auth = false } = {}) {
  let res;
  try {
    res = await fetch(`${API}${path}`, {
      method,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(auth ? authHeaders() : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    const err = new Error("We couldn't reach the club just now. Please try again.");
    err.status = 0;
    throw err;
  }

  const contentType = res.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const payload = isJson ? await res.json().catch(() => null) : await res.text().catch(() => '');

  if (!res.ok) {
    const message = (isJson && (payload?.message || payload?.error)) || res.statusText || 'Request failed';
    const err = new Error(message);
    err.status = res.status;
    err.payload = payload;
    throw err;
  }

  return isJson ? payload?.data ?? payload : payload;
}

export const api = {
  // Public
  club: () => request('/api/public/club'),
  sports: () => request('/api/public/sports'),
  plans: () => request('/api/public/membership-plans'),
  availability: ({ localDate, days = 1, sportId } = {}) => {
    const qs = new URLSearchParams();
    if (localDate) qs.set('localDate', localDate);
    if (days) qs.set('days', String(days));
    if (sportId) qs.set('sportId', sportId);
    return request(`/api/public/availability?${qs.toString()}`);
  },
  cancellationPolicy: () => request('/api/public/cancellation-policy'),
  enquiry: (payload) => request('/api/public/enquiry', { method: 'POST', body: payload }),
  trial: (payload) => request('/api/public/trial', { method: 'POST', body: payload }),

  // Auth
  login: (payload) => request('/api/public/auth/login', { method: 'POST', body: payload }),
  register: (payload) => request('/api/public/auth/register', { method: 'POST', body: payload }),
  me: () => request('/api/public/auth/me', { auth: true }),

  // Portal (User)
  quoteSlot: ({ courtId, startUtc }) =>
    request('/api/portal/quote-slot', { method: 'POST', auth: true, body: { courtId, startUtc } }),
  bookSlot: (payload) =>
    request('/api/portal/book-slot', { method: 'POST', auth: true, body: payload }),
  myBookings: () =>
    request('/api/portal/my-bookings', { auth: true }),
  cancelBooking: (id, payload) =>
    request(`/api/portal/my-bookings/${encodeURIComponent(id)}/cancel`, { method: 'POST', auth: true, body: payload }),
  buyMembership: (payload) =>
    request('/api/portal/buy-membership', { method: 'POST', auth: true, body: payload }),

  // Pro Shop (public catalogue — auth is optional, it unlocks member pricing)
  shopCategories: () => request('/api/public/shop/categories'),
  shopBrands: () => request('/api/public/shop/brands'),
  shopProducts: (params = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') qs.set(key, String(value));
    });
    const query = qs.toString();
    return request(`/api/public/shop/products${query ? `?${query}` : ''}`, {
      auth: hasAuthToken(),
    });
  },
  shopProduct: (slug) =>
    request(`/api/public/shop/products/${encodeURIComponent(slug)}`, { auth: hasAuthToken() }),

  // Pro Shop (signed in)
  cart: () => request('/api/portal/cart', { auth: true }),
  cartAdd: (payload) => request('/api/portal/cart/items', { method: 'POST', auth: true, body: payload }),
  cartUpdate: (itemId, quantity) =>
    request(`/api/portal/cart/items/${encodeURIComponent(itemId)}`, {
      method: 'PATCH',
      auth: true,
      body: { quantity },
    }),
  cartRemove: (itemId) =>
    request(`/api/portal/cart/items/${encodeURIComponent(itemId)}`, { method: 'DELETE', auth: true }),
  cartMerge: (items) =>
    request('/api/portal/cart/merge', { method: 'POST', auth: true, body: { items } }),
  checkoutQuote: (fulfillmentType) =>
    request(`/api/portal/checkout/quote?fulfillmentType=${encodeURIComponent(fulfillmentType)}`, {
      auth: true,
    }),
  checkout: (payload) => request('/api/portal/checkout', { method: 'POST', auth: true, body: payload }),
  myOrders: () => request('/api/portal/my-orders', { auth: true }),
  myOrder: (orderNumber) =>
    request(`/api/portal/my-orders/${encodeURIComponent(orderNumber)}`, { auth: true }),
  cancelOrder: (orderNumber, payload) =>
    request(`/api/portal/my-orders/${encodeURIComponent(orderNumber)}/cancel`, {
      method: 'POST',
      auth: true,
      body: payload || {},
    }),
};

export function formatPaise(paise) {
  if (paise == null || isNaN(paise)) return '₹0';
  const rupees = Number(paise) / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(rupees);
}

export function planMonthlyPaise(plan) {
  if (!plan) return 0;
  if (plan.pricePaise != null) return plan.pricePaise;
  const d1 = plan.durations?.find((d) => Number(d.months) === 1);
  if (d1?.pricePaise != null) return d1.pricePaise;
  const anyD = plan.durations?.[0];
  if (anyD && anyD.months) return Math.round(anyD.pricePaise / anyD.months);
  return 0;
}

export function formatSlotTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function formatCalendarDate(iso, options = {}) {
  if (!iso) return '—';
  const d = iso.includes('T') ? new Date(iso) : new Date(`${iso}T00:00:00+05:30`);
  return d.toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    ...options,
  });
}

export function todayLocalIST() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const y = parts.find((p) => p.type === 'year')?.value;
  const m = parts.find((p) => p.type === 'month')?.value;
  const d = parts.find((p) => p.type === 'day')?.value;
  return `${y}-${m}-${d}`;
}

export function shiftDate(isoDate, offsetDays) {
  const [y, m, d] = isoDate.split('-').map(Number);
  const base = new Date(Date.UTC(y, m - 1, d));
  base.setUTCDate(base.getUTCDate() + offsetDays);
  return base.toISOString().slice(0, 10);
}
