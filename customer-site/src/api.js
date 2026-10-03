const API = import.meta.env.VITE_API_URL || 'http://localhost:7003';

export function mediaUrl(path) {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  const clean = String(path).replace(/^\/+/, '');
  return `${API}/${clean}`;
}

async function get(path) {
  const res = await fetch(`${API}${path}`);
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.isOk === false) {
    throw new Error(json.message || `Request failed (${res.status})`);
  }
  return json.data;
}

async function post(path, body) {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.isOk === false) {
    throw new Error(json.message || `Request failed (${res.status})`);
  }
  return json.data;
}

export function formatPaise(paise) {
  if (paise == null || Number.isNaN(Number(paise))) return '—';
  return `₹${(Number(paise) / 100).toLocaleString('en-IN')}`;
}

export function planMonthlyPaise(plan) {
  const durations = plan?.durations || [];
  const monthly = durations.find((d) => d.months === 1) || durations[0];
  return monthly?.pricePaise ?? null;
}

export function todayLocalIST() {
  const d = new Date();
  const utc = d.getTime() + d.getTimezoneOffset() * 60000;
  const ist = new Date(utc + 5.5 * 60 * 60000);
  return ist.toISOString().slice(0, 10);
}

export const api = {
  club: () => get('/api/public/club'),
  sports: () => get('/api/public/sports'),
  plans: () => get('/api/public/membership-plans'),
  blogs: (limit = 12) => get(`/api/public/blogs?limit=${limit}`),
  availability: (q) => {
    const params = new URLSearchParams(
      Object.fromEntries(Object.entries(q).filter(([, v]) => v != null && v !== '')),
    ).toString();
    return get(`/api/public/availability?${params}`);
  },
  enquiry: (body) => post('/api/public/enquiries', body),
  trial: (body) => post('/api/public/trials', body),
};
