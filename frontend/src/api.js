// Thin fetch wrapper. The session token lives in localStorage (guarded - it can be unavailable).
const KEY = 'trustcart.token';
export const getToken = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
export const setToken = (t) => { try { t ? localStorage.setItem(KEY, t) : localStorage.removeItem(KEY); } catch { /* ignore */ } };

export class ApiError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

async function request(method, url, body) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = 'Bearer ' + token;
  let res;
  try {
    res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
  } catch {
    throw new ApiError(0, 'Cannot reach the Trust Cart server. Is the backend running?');
  }
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new ApiError(res.status, (data && data.error) || `Request failed (${res.status})`);
  return data;
}

export const api = {
  login: (b) => request('POST', '/api/auth/login', b),
  register: (b) => request('POST', '/api/auth/register', b),
  me: () => request('GET', '/api/auth/me'),
  meta: () => request('GET', '/api/meta'),
  products: (params = {}) => request('GET', '/api/products?' + new URLSearchParams(Object.entries(params).filter(([, v]) => v))),
  product: (id) => request('GET', `/api/products/${id}`),
  compare: (id) => request('GET', `/api/products/${id}/compare`),
  sellerProducts: () => request('GET', '/api/seller/products'),
  createProduct: (b) => request('POST', '/api/products', b),
  recheck: (id) => request('POST', `/api/products/${id}/recheck`),
  appeal: (id, message) => request('POST', `/api/products/${id}/appeal`, { message }),
  remove: (id) => request('DELETE', `/api/products/${id}`),
  health: () => request('GET', '/api/health'),
};

export const money = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
