/**
 * API helper — handles all HTTP calls to the backend.
 */
const API = (() => {
  const BASE_URL = 'http://localhost:5000/api';

  function getToken() {
    return localStorage.getItem('token');
  }

  function setToken(token) {
    localStorage.setItem('token', token);
  }

  function clearToken() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  function getUser() {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  }

  function setUser(user) {
    localStorage.setItem('user', JSON.stringify(user));
  }

  async function request(endpoint, options = {}) {
    const url = `${BASE_URL}${endpoint}`;
    const headers = { 'Content-Type': 'application/json' };
    const token = getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(url, {
      ...options,
      headers: { ...headers, ...options.headers }
    });

    const data = await res.json();

    if (!res.ok) {
      // Handle token expiry
      if (res.status === 401) {
        clearToken();
        window.location.reload();
      }
      const errorMsg = data.error || (data.errors && data.errors.map(e => e.msg).join(', ')) || 'Request failed';
      throw new Error(errorMsg);
    }

    return data;
  }

  return {
    getToken,
    setToken,
    clearToken,
    getUser,
    setUser,

    signup(name, email, password) {
      return request('/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ name, email, password })
      });
    },

    login(email, password) {
      return request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
    },

    getMe() {
      return request('/auth/me');
    },

    getProfile() {
      return request('/profile');
    },

    updateProfile(profileData) {
      return request('/profile', {
        method: 'PUT',
        body: JSON.stringify(profileData)
      });
    },

    syncWearable(deviceType, data) {
      return request('/wearable/sync', {
        method: 'POST',
        body: JSON.stringify({ deviceType, data })
      });
    },

    getWearableData() {
      return request('/wearable/data');
    },

    getLatestWearable() {
      return request('/wearable/latest');
    },

    getRawEncryptedData() {
      return request('/profile/raw');
    }
  };
})();
