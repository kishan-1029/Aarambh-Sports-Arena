import { config } from './config.js';

export class ApiError extends Error {
  constructor(message, status, payload) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

export class ArambhApiClient {
  constructor(apiKey = config.apiKey, baseUrl = config.apiUrl) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  setApiKey(key) {
    this.apiKey = key;
  }

  buildUrl(path, query) {
    const normalized = path.startsWith('/') ? path : `/${path}`;
    const url = new URL(`${this.baseUrl}${normalized}`);
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
      }
    }
    return url.toString();
  }

  async request(path, { method = 'GET', body, query } = {}) {
    if (!this.apiKey) {
      throw new ApiError('ARAMBH_MCP_API_KEY is not set', 401);
    }
    const headers = {
      Authorization: `Bearer ${this.apiKey}`,
      Accept: 'application/json',
    };
    const init = { method, headers };
    if (body !== undefined && method !== 'GET') {
      headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(body);
    }
    const res = await fetch(this.buildUrl(path, query), init);
    const text = await res.text();
    let payload = null;
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        payload = text;
      }
    }
    if (!res.ok || payload?.isOk === false) {
      throw new ApiError(
        payload?.message || `API ${res.status}`,
        res.status,
        payload,
      );
    }
    return payload?.data !== undefined ? payload.data : payload;
  }

  get(path, query) {
    return this.request(path, { method: 'GET', query });
  }

  post(path, body) {
    return this.request(path, { method: 'POST', body });
  }
}

export default ArambhApiClient;
