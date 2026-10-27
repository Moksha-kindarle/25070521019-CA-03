// Base API URL
const BASE = '/api/v1';

async function request(method, path, body = null) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw { status: res.status, message: data.message || 'Request failed', data };
  return data;
}

export const api = {
  get:    (path)        => request('GET',    path),
  post:   (path, body)  => request('POST',   path, body),
  patch:  (path, body)  => request('PATCH',  path, body),
  delete: (path)        => request('DELETE', path),
};

// Auth
export const authApi = {
  signup:  (data) => api.post('/auth/signup', data),
  login:   (data) => api.post('/auth/login', data),
  logout:  ()     => api.post('/auth/logout'),
  me:      ()     => api.get('/auth/me'),
};

// Dashboard
export const dashboardApi = {
  summary: () => api.get('/dashboard/summary'),
  trends:  () => api.get('/dashboard/trends'),
  alerts:  () => api.get('/dashboard/alerts'),
};

// Products
export const productsApi = {
  list:    (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return api.get(`/products${q ? '?' + q : ''}`);
  },
  get:     (id)   => api.get(`/products/${id}`),
  create:  (data) => api.post('/products', data),
  update:  (id, data) => api.patch(`/products/${id}`, data),
  delete:  (id)   => api.delete(`/products/${id}`),
};

// Categories
export const categoriesApi = {
  list:   () => api.get('/categories'),
  create: (data) => api.post('/categories', data),
};

// Inventory
export const inventoryApi = {
  movements: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return api.get(`/inventory/movements${q ? '?' + q : ''}`);
  },
  adjust: (data) => api.post('/inventory/adjust', data),
};

// Sales / Billing
export const salesApi = {
  list:     (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return api.get(`/sales${q ? '?' + q : ''}`);
  },
  get:      (id)   => api.get(`/sales/${id}`),
  create:   (data) => api.post('/sales', data),
  cancel:   (id)   => api.patch(`/sales/${id}/cancel`),
};

// Reports
export const reportsApi = {
  sales:      (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return api.get(`/reports/sales${q ? '?' + q : ''}`);
  },
  topProducts: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return api.get(`/reports/top-products${q ? '?' + q : ''}`);
  },
  stock:      () => api.get('/reports/stock'),
};

// Users
export const usersApi = {
  profile:        ()       => api.get('/users/profile'),
  updateProfile:  (data)   => api.patch('/users/profile', data),
  changePassword: (data)   => api.patch('/users/password', data),
  list:           ()       => api.get('/users'),
};
