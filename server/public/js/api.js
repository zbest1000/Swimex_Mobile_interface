/**
 * SwimEx EDGE — REST API Client
 * Base URL detection, token management, auth, workouts, admin
 */

const API = (function () {
  'use strict';

  // Base URL: same origin when served by Express
  const getBaseUrl = () => {
    if (typeof window === 'undefined') return '';
    const { protocol, hostname, port } = window.location;
    const portPart = port && !['80', '443'].includes(port) ? `:${port}` : '';
    return `${protocol}//${hostname}${portPart}`;
  };

  const TOKEN_KEY = 'swimex_token';

  function getToken() {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  }

  function setToken(token) {
    try {
      if (token) localStorage.setItem(TOKEN_KEY, token);
      else localStorage.removeItem(TOKEN_KEY);
    } catch (e) {
      console.warn('localStorage unavailable', e);
    }
  }

  async function request(method, path, body = null, options = {}) {
    const url = `${getBaseUrl()}${path}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const config = { method, headers };
    if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      config.body = JSON.stringify(body);
    }

    const res = await fetch(url, config);
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const err = new Error(data.error?.message || res.statusText || 'Request failed');
      err.status = res.status;
      err.code = data.error?.code;
      throw err;
    }

    return data;
  }

  return {
    getBaseUrl,
    getToken,
    setToken,

    // Auth
    async login(username, password) {
      const { data } = await request('POST', '/api/auth/login', { username, password });
      if (data.token) setToken(data.token);
      return data;
    },

    async register(username, password, displayName, email) {
      const { data } = await request('POST', '/api/auth/register', {
        username,
        password,
        displayName: displayName || username,
        email: email || null,
      });
      if (data.token) setToken(data.token);
      return data;
    },

    async logout() {
      try {
        await request('POST', '/api/auth/logout');
      } finally {
        setToken(null);
      }
    },

    async getProfile() {
      const { data } = await request('GET', '/api/auth/me');
      return data;
    },

    async updatePreferences(prefs) {
      const { data } = await request('PUT', '/api/auth/me/preferences', prefs);
      return data;
    },

    // Workout control
    async quickStart(speed, timeMs) {
      const { data } = await request('POST', '/api/workouts/quick-start', { speed, timeMs });
      return data;
    },

    async startProgram(programId) {
      const { data } = await request('POST', '/api/workouts/start-program', { programId });
      return data;
    },

    async pause() {
      const { data } = await request('POST', '/api/workouts/pause');
      return data;
    },

    async resume() {
      const { data } = await request('POST', '/api/workouts/resume');
      return data;
    },

    async stop() {
      await request('POST', '/api/workouts/stop');
    },

    async setSpeed(speed) {
      const { data } = await request('POST', '/api/workouts/set-speed', { speed });
      return data;
    },

    async adjustSpeed(delta) {
      await request('POST', '/api/workouts/adjust-speed', { delta });
    },

    async getActiveWorkout() {
      const { data } = await request('GET', '/api/workouts/active');
      return data;
    },

    // Program CRUD
    async getPrograms() {
      const { data } = await request('GET', '/api/workouts/programs');
      return data;
    },

    async getProgram(id) {
      const { data } = await request('GET', `/api/workouts/programs/${id}`);
      return data;
    },

    async createProgram(program) {
      const { data } = await request('POST', '/api/workouts/programs', program);
      return data;
    },

    async updateProgram(id, updates) {
      const { data } = await request('PUT', `/api/workouts/programs/${id}`, updates);
      return data;
    },

    async deleteProgram(id) {
      await request('DELETE', `/api/workouts/programs/${id}`);
    },

    async getPresets() {
      const { data } = await request('GET', '/api/workouts/presets');
      return data;
    },

    // Admin
    async listUsers(role) {
      const q = role ? `?role=${encodeURIComponent(role)}` : '';
      const { data } = await request('GET', `/api/users${q}`);
      return data;
    },

    async updateRole(userId, role) {
      const { data } = await request('PUT', `/api/users/${userId}/role`, { role });
      return data;
    },

    async listDevices() {
      const { data } = await request('GET', '/api/admin/devices');
      return data;
    },

    async registerDevice(macAddress, deviceName, deviceType) {
      const { data } = await request('POST', '/api/admin/devices', {
        macAddress,
        deviceName: deviceName || 'Tablet',
        deviceType: deviceType || 'TABLET',
      });
      return data;
    },

    // Health
    async healthCheck() {
      const { data } = await request('GET', '/api/health');
      return data;
    },
  };
})();
