const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:7002';

/**
 * @param {string} path e.g. /api/public/club
 * @param {RequestInit} [init]
 */
export async function publicFetch(path, init = {}) {
  const url = `${API_URL}${path.startsWith('/') ? path : `/${path}`}`;
  const hasRevalidate = init.next?.revalidate != null;
  const res = await fetch(url, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init.headers || {}),
    },
    ...(hasRevalidate || init.cache ? {} : { cache: 'no-store' }),
  });

  let json;
  try {
    json = await res.json();
  } catch {
    throw new Error(`Invalid response from ${path}`);
  }

  if (!res.ok || json?.isOk === false) {
    const msg = json?.message || json?.error || `Request failed (${res.status})`;
    const err = new Error(msg);
    err.status = res.status;
    err.payload = json;
    throw err;
  }

  return json.data;
}

export function apiBase() {
  return API_URL;
}

export async function getClub() {
  return publicFetch('/api/public/club', { next: { revalidate: 60 } });
}

export async function getSports() {
  return publicFetch('/api/public/sports', { next: { revalidate: 60 } });
}

export async function getMembershipPlans() {
  return publicFetch('/api/public/membership-plans', { next: { revalidate: 60 } });
}

export async function getAvailability({ localDate, sportId, days }) {
  const q = new URLSearchParams({ localDate });
  if (sportId) q.set('sportId', sportId);
  if (days) q.set('days', String(days));
  return publicFetch(`/api/public/availability?${q}`);
}

export async function postEnquiry(body) {
  return publicFetch('/api/public/enquiries', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function postTrial(body) {
  return publicFetch('/api/public/trials', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
