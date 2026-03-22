/**
 * SwimEx EDGE — REST API Client
 * Full-featured API client with auth, workouts, programs, admin, and graphics.
 */
const EdgeAPI = (function () {
  'use strict';

  const TOKEN_KEY = 'swimex_token';
  const USER_KEY = 'swimex_user';

  function getBaseUrl() {
    if (typeof window === 'undefined') return '';
    const { protocol, hostname, port } = window.location;
    const p = port && !['80', '443'].includes(port) ? ':' + port : '';
    return protocol + '//' + hostname + p;
  }

  function getToken() {
    try { return localStorage.getItem(TOKEN_KEY); }
    catch { return null; }
  }

  function setToken(token) {
    try {
      if (token) localStorage.setItem(TOKEN_KEY, token);
      else localStorage.removeItem(TOKEN_KEY);
    } catch (_) {}
  }

  function getCachedUser() {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  function setCachedUser(user) {
    try {
      if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
      else localStorage.removeItem(USER_KEY);
    } catch (_) {}
  }

  function isLoggedIn() {
    return !!getToken();
  }

  function getRole() {
    const u = getCachedUser();
    return u ? u.role : null;
  }

  async function request(method, path, body, opts) {
    opts = opts || {};
    const url = getBaseUrl() + path;
    const headers = Object.assign({}, opts.headers || {});
    const token = getToken();
    if (token) headers['Authorization'] = 'Bearer ' + token;

    if (!opts.raw) {
      headers['Content-Type'] = 'application/json';
    }

    const config = { method: method, headers: headers };

    if (body !== undefined && body !== null) {
      if (opts.raw) {
        config.body = body;
        delete headers['Content-Type'];
      } else {
        config.body = JSON.stringify(body);
      }
    }

    const res = await fetch(url, config);

    if (res.status === 204) return {};

    let data;
    try { data = await res.json(); }
    catch { data = {}; }

    if (!res.ok) {
      const err = new Error(
        (data.error && data.error.message) || data.message || res.statusText || 'Request failed'
      );
      err.status = res.status;
      err.code = data.error ? data.error.code : undefined;
      err.data = data;
      if (res.status === 401) {
        setToken(null);
        setCachedUser(null);
      }
      throw err;
    }

    return data.data !== undefined ? data.data : data;
  }

  return {
    getBaseUrl: getBaseUrl,
    getToken: getToken,
    setToken: setToken,
    isLoggedIn: isLoggedIn,
    getRole: getRole,
    getCachedUser: getCachedUser,

    // ---- Auth ----
    async login(username, password) {
      const d = await request('POST', '/api/auth/login', { username: username, password: password });
      const result = d.token ? d : (d.data || d);
      if (result.token) setToken(result.token);
      if (result.user) setCachedUser(result.user);
      return result;
    },

    async register(username, password, displayName) {
      const d = await request('POST', '/api/auth/register', {
        username: username,
        password: password,
        displayName: displayName || username
      });
      const result = d.token ? d : (d.data || d);
      if (result.token) setToken(result.token);
      if (result.user) setCachedUser(result.user);
      return result;
    },

    async logout() {
      try { await request('POST', '/api/auth/logout'); }
      catch (_) {}
      setToken(null);
      setCachedUser(null);
    },

    async getProfile() {
      const d = await request('GET', '/api/auth/me');
      if (d && d.user) setCachedUser(d.user);
      else if (d && d.username) setCachedUser(d);
      return d;
    },

    async updatePreferences(prefs) {
      return await request('PUT', '/api/auth/me/preferences', prefs);
    },

    // ---- System Status & Commissioning ----
    async getSystemStatus() {
      return await request('GET', '/api/auth/system-status');
    },

    async getCommissionStatus() {
      return await request('GET', '/api/auth/commission/status');
    },

    async commissionStep1(swimexCode, bscCode) {
      return await request('POST', '/api/auth/commission/step1-codes', { swimexCode, bscCode });
    },

    async commissionStep2(superAdminNewPassword, adminUsername, adminPassword, adminDisplayName) {
      return await request('POST', '/api/auth/commission/step2-accounts', {
        superAdminNewPassword, adminUsername, adminPassword, adminDisplayName
      });
    },

    async commissionStep3(networkConfig) {
      return await request('POST', '/api/auth/commission/step3-network', networkConfig);
    },

    async commissionStep4(plcConfig) {
      return await request('POST', '/api/auth/commission/step4-plc', plcConfig);
    },

    async commissionStep5(tabletMacs, template) {
      return await request('POST', '/api/auth/commission/step5-finalize', { tabletMacs, template });
    },

    async resetSuperAdmin(data) {
      return await request('POST', '/api/auth/reset-super-admin', data);
    },

    // ---- Workout Control ----
    async quickStart(speed, durationMs) {
      return await request('POST', '/api/workouts/quick-start', {
        speed: speed,
        durationMs: durationMs
      });
    },

    async startProgram(programId) {
      return await request('POST', '/api/workouts/start-program', { programId: programId });
    },

    async startPreset(type, level) {
      return await request('POST', '/api/workouts/start-preset', { type: type, level: level });
    },

    async startInterval(sets, step1, step2) {
      return await request('POST', '/api/workouts/start-interval', {
        sets: sets,
        step1: step1,
        step2: step2
      });
    },

    async pause() {
      return await request('POST', '/api/workouts/pause');
    },

    async resume() {
      return await request('POST', '/api/workouts/resume');
    },

    async stop() {
      return await request('POST', '/api/workouts/stop');
    },

    async setSpeed(speed) {
      return await request('POST', '/api/workouts/set-speed', { speed: speed });
    },

    async adjustSpeed(delta) {
      return await request('POST', '/api/workouts/adjust-speed', { delta: delta });
    },

    async getActive() {
      return await request('GET', '/api/workouts/active');
    },

    // ---- Programs ----
    async listPrograms() {
      return await request('GET', '/api/workouts/programs');
    },

    async getProgram(id) {
      return await request('GET', '/api/workouts/programs/' + id);
    },

    async createProgram(data) {
      return await request('POST', '/api/workouts/programs', data);
    },

    async updateProgram(id, data) {
      return await request('PUT', '/api/workouts/programs/' + id, data);
    },

    async cloneProgram(id, name) {
      return await request('POST', '/api/workouts/programs/' + id + '/clone', { name: name });
    },

    async deleteProgram(id) {
      return await request('DELETE', '/api/workouts/programs/' + id);
    },

    // ---- History ----
    async getHistory(limit, offset) {
      const q = [];
      if (limit) q.push('limit=' + limit);
      if (offset) q.push('offset=' + offset);
      const qs = q.length ? '?' + q.join('&') : '';
      return await request('GET', '/api/workouts/history' + qs);
    },

    async getStats() {
      return await request('GET', '/api/workouts/stats');
    },

    // ---- Presets ----
    async getPresets() {
      return await request('GET', '/api/workouts/presets');
    },

    // ---- Admin: Dashboard ----
    async getDashboard() {
      return await request('GET', '/api/admin/dashboard');
    },

    // ---- Admin: Users ----
    async listUsers() {
      return await request('GET', '/api/users');
    },

    async createUser(data) {
      return await request('POST', '/api/users', data);
    },

    async updateRole(userId, role) {
      return await request('PUT', '/api/users/' + userId + '/role', { role: role });
    },

    async disableUser(userId) {
      return await request('PUT', '/api/users/' + userId + '/disable');
    },

    async enableUser(userId) {
      return await request('PUT', '/api/users/' + userId + '/enable');
    },

    async deleteUser(userId) {
      return await request('DELETE', '/api/users/' + userId);
    },

    // ---- Admin: Devices ----
    async listDevices() {
      return await request('GET', '/api/admin/devices');
    },

    async registerDevice(mac, name, type) {
      return await request('POST', '/api/admin/devices', {
        macAddress: mac,
        deviceName: name || 'Tablet',
        deviceType: type || 'TABLET'
      });
    },

    async revokeDevice(id) {
      return await request('DELETE', '/api/admin/devices/' + id);
    },

    // ---- Admin: Communication ----
    async listCommConfigs() {
      return await request('GET', '/api/admin/communication');
    },

    // ---- Admin: Tags ----
    async listTagMappings() {
      return await request('GET', '/api/admin/tags');
    },

    async createTagMapping(data) {
      return await request('POST', '/api/admin/tags', data);
    },

    async deleteTagMapping(id) {
      return await request('DELETE', '/api/admin/tags/' + id);
    },

    // ---- Admin: Feature Flags ----
    async getFeatureFlags() {
      return await request('GET', '/api/admin/feature-flags');
    },

    async setFeatureFlag(key, enabled, visible) {
      return await request('PUT', '/api/admin/feature-flags/' + key, {
        enabled: enabled,
        visible: visible
      });
    },

    // ---- Admin: Layouts ----
    async listLayouts() {
      return await request('GET', '/api/admin/layouts');
    },

    async getActiveLayout() {
      return await request('GET', '/api/admin/layouts/active');
    },

    async createLayout(data) {
      return await request('POST', '/api/admin/layouts', data);
    },

    async publishLayout(id) {
      return await request('PUT', '/api/admin/layouts/' + id + '/publish');
    },

    // ---- Admin: Audit Log ----
    async getAuditLog(params) {
      const q = [];
      if (params) {
        Object.keys(params).forEach(function (k) {
          if (params[k] !== undefined && params[k] !== null) {
            q.push(encodeURIComponent(k) + '=' + encodeURIComponent(params[k]));
          }
        });
      }
      const qs = q.length ? '?' + q.join('&') : '';
      return await request('GET', '/api/admin/audit-log' + qs);
    },

    // ---- Graphics ----
    async listGraphics(params) {
      var q = [];
      if (params) {
        Object.keys(params).forEach(function (k) {
          if (params[k] !== undefined && params[k] !== null) {
            q.push(encodeURIComponent(k) + '=' + encodeURIComponent(params[k]));
          }
        });
      }
      var qs = q.length ? '?' + q.join('&') : '';
      return await request('GET', '/api/graphics' + qs);
    },

    async getGraphic(id) {
      return await request('GET', '/api/graphics/' + id);
    },

    async uploadGraphic(formData) {
      return await request('POST', '/api/graphics', formData, { raw: true });
    },

    async deleteGraphic(id) {
      return await request('DELETE', '/api/graphics/' + id);
    },

    // ---- Admin: WiFi AP Management ----
    async getWifiConfig() {
      return await request('GET', '/api/admin/wifi');
    },

    async updateWifiConfig(config) {
      return await request('PUT', '/api/admin/wifi', config);
    },

    async startWifiAp() {
      return await request('POST', '/api/admin/wifi/start');
    },

    async stopWifiAp() {
      return await request('POST', '/api/admin/wifi/stop');
    },

    // ---- Admin: Config Export/Import ----
    async exportConfig() {
      return await request('GET', '/api/admin/config/export');
    },

    async importConfig(configData, options) {
      return await request('POST', '/api/admin/config/import', {
        config: configData,
        overwrite: options ? options.overwrite : false,
        sections: options ? options.sections : undefined
      });
    },

    // ---- Admin: Branding ----
    async getBranding() {
      return await request('GET', '/api/admin/branding');
    },

    async updateBranding(data) {
      return await request('PUT', '/api/admin/branding', data);
    },

    async getPublicBranding() {
      return await request('GET', '/api/branding');
    },

    // ---- Admin: Logos ----
    async listLogos() {
      return await request('GET', '/api/admin/logos');
    },

    async uploadLogo(type, formData) {
      return await request('POST', '/api/admin/logos/' + type, formData, { raw: true });
    },

    async deleteLogo(type) {
      return await request('DELETE', '/api/admin/logos/' + type);
    },

    getLogoUrl(type) {
      return getBaseUrl() + '/api/logos/' + type;
    },

    // ---- Admin: Device Bulk Import/Export ----
    async exportDevices() {
      return await request('GET', '/api/admin/devices/export');
    },

    async importDevices(devices) {
      return await request('POST', '/api/admin/devices/import', { devices: devices });
    },

    // ---- Health ----
    async check() {
      return await request('GET', '/api/health');
    }
  };
})();
