import { API_BASE_URL } from '../config/config.js';

class ApiError extends Error {
  constructor(message, status, data = null) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

const TOKEN_STORAGE_KEY = 'foodlens_auth_token';

function getStoredToken() {
  try {
    return window.localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

function setStoredToken(token) {
  try {
    if (token) {
      window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch {
    // Ignore storage errors in restricted contexts
  }
}

async function request(url, options = {}) {
  const isFormData = options.body instanceof FormData;
  const token = getStoredToken();
  const headers = isFormData ? {} : { 'Content-Type': 'application/json' };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${url}`, {
    credentials: 'include',
    ...options,
    headers: {
      ...headers,
      ...(options.headers || {}),
    },
  });

  const rawText = await response.text().catch(() => '');
  let data = {};
  if (rawText) {
    try {
      data = JSON.parse(rawText);
    } catch {
      if (response.ok) {
        throw new ApiError('Unexpected non-JSON response from server.', response.status);
      }
      data = {};
    }
  }

  if (!response.ok) {
    if (response.status === 401) {
      setStoredToken(null);
    }
    const errMsg =
      typeof data.error === 'string' && data.error.length > 0
        ? data.error
        : `Request failed with status ${response.status}`;
    throw new ApiError(errMsg, response.status, data);
  }

  return data;
}

export const api = {
  auth: {
    register: async (payload) => {
      const res = await request('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (res.token) setStoredToken(res.token);
      return res;
    },
    login: async (payload) => {
      const res = await request('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (res.token) setStoredToken(res.token);
      return res;
    },
    logout: async () => {
      try {
        return await request('/api/auth/logout', {
          method: 'POST',
        });
      } finally {
        setStoredToken(null);
      }
    },
    me: () => request('/api/auth/me'),
    updateMe: async (payload) => {
      const res = await request('/api/auth/me', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      if (res.token) setStoredToken(res.token);
      return res;
    },
  },

  profile: {
    get: () => request('/api/profile'),
    update: (profile) =>
      request('/api/profile', {
        method: 'PUT',
        body: JSON.stringify(profile),
      }),
  },

  products: {
    lookupBarcode: (barcode, save = true) =>
      request(`/api/products/barcode/${encodeURIComponent(barcode)}?save=${save}`),
    analyze: (payload) =>
      request('/api/products/analyze', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
  },

  ocr: {
    extractImage: (file) => {
      const formData = new FormData();
      formData.append('image', file);
      return request('/api/ocr/extract', {
        method: 'POST',
        body: formData,
      });
    },
  },

  history: {
    list: (params = {}) => {
      const sp = new URLSearchParams();
      if (params.verdict && params.verdict !== 'All') sp.set('verdict', params.verdict);
      if (params.search) sp.set('search', params.search);
      if (params.bookmarked) sp.set('bookmarked', 'true');
      const qs = sp.toString();
      return request(`/api/history${qs ? `?${qs}` : ''}`);
    },
    get: (id) => request(`/api/history/${id}`),
    update: (id, payload) =>
      request(`/api/history/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
    recheck: (id) =>
      request(`/api/history/${id}/recheck`, {
        method: 'POST',
      }),
    remove: (id) =>
      request(`/api/history/${id}`, {
        method: 'DELETE',
      }),
  },

  glossary: {
    list: (params = {}) => {
      const sp = new URLSearchParams();
      if (params.search) sp.set('search', params.search);
      if (params.category && params.category !== 'All') sp.set('category', params.category);
      const qs = sp.toString();
      return request(`/api/glossary${qs ? `?${qs}` : ''}`);
    },
    create: (payload) =>
      request('/api/glossary', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    update: (id, payload) =>
      request(`/api/glossary/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
    remove: (id) =>
      request(`/api/glossary/${id}`, {
        method: 'DELETE',
      }),
  },

  admin: {
    stats: () => request('/api/admin/stats'),
    users: () => request('/api/admin/users'),
    updateUserRole: (id, role) =>
      request(`/api/admin/users/${id}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      }),
    recentScans: () => request('/api/admin/scans'),
  },
};
