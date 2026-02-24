/**
 * SwimEx EDGE — Main SPA Application
 * Hash-based router, all screens, auth management, WebSocket reactive updates, themes.
 */
var EdgeApp = (function () {
  'use strict';

  var appEl, mainEl;
  var currentRoute = '';
  var currentParams = [];
  var activeWorkout = null;
  var workoutPollTimer = null;

  // ============ SVG Icon Helpers ============
  var icons = {
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
    zap: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
    list: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>',
    repeat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>',
    target: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>',
    sprint: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>',
    user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
    settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>',
    sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>',
    moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>',
    play: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>',
    logout: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>'
  };

  function icon(name, cls) {
    return '<span class="nav-icon' + (cls ? ' ' + cls : '') + '">' + (icons[name] || '') + '</span>';
  }

  // ============ Toast Notifications ============
  var toastContainer = null;

  function ensureToastContainer() {
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.className = 'toast-container';
      document.body.appendChild(toastContainer);
    }
  }

  function toast(message, type) {
    ensureToastContainer();
    type = type || 'info';
    var iconMap = { success: '&#x2714;', error: '&#x2718;', warning: '&#x26A0;', info: '&#x2139;' };
    var el = document.createElement('div');
    el.className = 'toast toast-' + type;
    el.innerHTML =
      '<span class="toast-icon">' + (iconMap[type] || iconMap.info) + '</span>' +
      '<span class="toast-message">' + escapeHtml(message) + '</span>' +
      '<button class="toast-close">&times;</button>';
    el.querySelector('.toast-close').addEventListener('click', function () { removeToast(el); });
    toastContainer.appendChild(el);
    setTimeout(function () { removeToast(el); }, 4000);
  }

  function removeToast(el) {
    if (!el || !el.parentNode) return;
    el.classList.add('toast-out');
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 200);
  }

  // ============ Confirmation Dialog ============
  function confirmDialog(title, message) {
    return new Promise(function (resolve) {
      var overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      overlay.innerHTML =
        '<div class="modal">' +
          '<div class="modal-title">' + escapeHtml(title) + '</div>' +
          '<div class="modal-body">' + escapeHtml(message) + '</div>' +
          '<div class="modal-actions">' +
            '<button class="btn btn-ghost" data-action="cancel">Cancel</button>' +
            '<button class="btn btn-danger" data-action="confirm">Confirm</button>' +
          '</div>' +
        '</div>';
      overlay.querySelector('[data-action="cancel"]').addEventListener('click', function () {
        overlay.remove();
        resolve(false);
      });
      overlay.querySelector('[data-action="confirm"]').addEventListener('click', function () {
        overlay.remove();
        resolve(true);
      });
      overlay.addEventListener('click', function (e) {
        if (e.target === overlay) { overlay.remove(); resolve(false); }
      });
      document.body.appendChild(overlay);
    });
  }

  // ============ Utility ============
  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.from((ctx || document).querySelectorAll(sel)); }

  // ============ Theme ============
  function getTheme() {
    try { return localStorage.getItem('swimex_theme') || 'dark'; } catch { return 'dark'; }
  }

  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem('swimex_theme', theme); } catch (_) {}
    updateThemeButton();
  }

  function toggleTheme() {
    setTheme(getTheme() === 'dark' ? 'light' : 'dark');
  }

  function updateThemeButton() {
    var btn = $('#theme-toggle-btn');
    if (btn) {
      btn.innerHTML = getTheme() === 'dark' ? icons.sun : icons.moon;
    }
  }

  // ============ Router ============
  function parseHash() {
    var hash = window.location.hash.replace(/^#\/?/, '') || 'home';
    var parts = hash.split('/');
    return { route: parts[0], params: parts.slice(1) };
  }

  function navigate(route) {
    window.location.hash = '#/' + route;
  }

  function handleRoute() {
    var parsed = parseHash();
    currentRoute = parsed.route;
    currentParams = parsed.params;
    renderApp();
  }

  // ============ Navigation Bar ============
  function renderNav() {
    var loggedIn = EdgeAPI.isLoggedIn();
    var role = EdgeAPI.getRole();
    var isAdmin = role === 'admin' || role === 'super_admin';
    var user = EdgeAPI.getCachedUser();
    var initial = user ? (user.displayName || user.username || '?')[0].toUpperCase() : '?';

    var links = [
      { route: 'home', label: 'Home', icon: 'home' },
      { route: 'quick-start', label: 'Quick Start', icon: 'zap' },
      { route: 'custom-programs', label: 'Programs', icon: 'list' },
      { route: 'interval', label: 'Interval', icon: 'repeat' },
      { route: 'distance', label: 'Distance', icon: 'target' },
      { route: 'sprint', label: 'Sprint', icon: 'sprint' }
    ];

    var navLinksHtml = links.map(function (l) {
      var active = currentRoute === l.route ? ' active' : '';
      return '<a href="#/' + l.route + '" class="nav-link' + active + '">' +
        icon(l.icon) + '<span>' + l.label + '</span></a>';
    }).join('');

    var rightHtml =
      '<button class="nav-theme-btn" id="theme-toggle-btn" title="Toggle theme">' +
        (getTheme() === 'dark' ? icons.sun : icons.moon) +
      '</button>';

    if (loggedIn) {
      rightHtml +=
        '<a href="#/profile" class="nav-user-btn" title="Profile">' + escapeHtml(initial) + '</a>';
      if (isAdmin) {
        rightHtml += '<a href="#/admin" class="nav-link' + (currentRoute === 'admin' ? ' active' : '') +
          '" style="padding:0.5rem;">' + icon('settings') + '</a>';
      }
    } else {
      rightHtml +=
        '<a href="#/login" class="btn btn-sm btn-primary">Login</a>';
    }

    return '<nav class="top-nav">' +
      '<a href="#/home" class="nav-logo">' +
        '<img src="/assets/logo.svg" alt="SwimEx">' +
        '<span class="nav-logo-text">EDGE</span>' +
      '</a>' +
      '<div class="nav-links">' + navLinksHtml + '</div>' +
      '<div class="nav-right">' + rightHtml + '</div>' +
    '</nav>';
  }

  // ============ Connection Status ============
  function renderConnectionDot() {
    return '<div class="connection-dot disconnected" id="conn-dot">' +
      '<span class="connection-dot-circle"></span>' +
      '<span id="conn-label">Connecting...</span>' +
    '</div>';
  }

  function updateConnectionDot(state) {
    var dot = $('#conn-dot');
    if (!dot) return;
    dot.className = 'connection-dot ' + state;
    var label = $('#conn-label');
    if (label) {
      if (state === 'connected') label.textContent = 'Connected';
      else if (state === 'connecting') label.textContent = 'Connecting...';
      else label.textContent = 'Disconnected';
    }
  }

  // ============ Screen Renderers ============
  function screenHome() {
    var modes = [
      { route: 'quick-start', label: 'Quick Start', desc: 'Set speed & time, start immediately', icon: 'zap' },
      { route: 'custom-programs', label: 'Custom Programs', desc: 'Build multi-step workout programs', icon: 'list' },
      { route: 'interval', label: 'Interval', desc: 'Alternating speed intervals with sets', icon: 'repeat' },
      { route: 'distance', label: 'Distance', desc: 'Preset distance-based workouts', icon: 'target' },
      { route: 'sprint', label: 'Sprint', desc: 'High-intensity sprint training', icon: 'sprint' }
    ];

    var cards = modes.map(function (m) {
      return '<a href="#/' + m.route + '" class="mode-card">' +
        '<div class="mode-card-icon">' + icon(m.icon) + '</div>' +
        '<div class="mode-card-label">' + m.label + '</div>' +
        '<div class="mode-card-desc">' + m.desc + '</div>' +
      '</a>';
    }).join('');

    return '<div class="screen-header">' +
      '<div><h1 class="screen-title">SwimEx EDGE</h1>' +
      '<p class="screen-subtitle">Pool Control System</p></div>' +
    '</div>' +
    '<div class="mode-grid">' + cards + '</div>';
  }

  function screenLogin() {
    return '<div class="form-card card">' +
      '<h2 class="card-title">Login</h2>' +
      '<form id="login-form">' +
        '<div class="form-group">' +
          '<label class="form-label">Username</label>' +
          '<input type="text" class="form-input" name="username" required autocomplete="username" placeholder="Enter username">' +
        '</div>' +
        '<div class="form-group">' +
          '<label class="form-label">Password</label>' +
          '<input type="password" class="form-input" name="password" required autocomplete="current-password" placeholder="Enter password">' +
        '</div>' +
        '<div id="login-error" class="form-error" style="display:none;margin-bottom:1rem;"></div>' +
        '<button type="submit" class="btn btn-primary btn-lg btn-block">Login</button>' +
      '</form>' +
      '<p class="text-center text-sm mt-2">Don\'t have an account? <a href="#/register">Register</a></p>' +
    '</div>';
  }

  function screenRegister() {
    return '<div class="form-card card">' +
      '<h2 class="card-title">Create Account</h2>' +
      '<form id="register-form">' +
        '<div class="form-group">' +
          '<label class="form-label">Username</label>' +
          '<input type="text" class="form-input" name="username" required placeholder="Choose a username">' +
        '</div>' +
        '<div class="form-group">' +
          '<label class="form-label">Display Name</label>' +
          '<input type="text" class="form-input" name="displayName" placeholder="Optional display name">' +
        '</div>' +
        '<div class="form-group">' +
          '<label class="form-label">Password</label>' +
          '<input type="password" class="form-input" name="password" required placeholder="Min 6 characters" minlength="6">' +
        '</div>' +
        '<div id="register-error" class="form-error" style="display:none;margin-bottom:1rem;"></div>' +
        '<button type="submit" class="btn btn-primary btn-lg btn-block">Register</button>' +
      '</form>' +
      '<p class="text-center text-sm mt-2">Already have an account? <a href="#/login">Login</a></p>' +
    '</div>';
  }

  function screenQuickStart() {
    return '<div class="screen-header">' +
      '<h1 class="screen-title">Quick Start</h1>' +
    '</div>' +
    '<div class="quick-start-layout">' +
      '<div class="card w-full text-center">' +
        '<p class="text-muted mb-1">Speed</p>' +
        '<div class="speed-display" id="qs-speed-display">50<span class="speed-display-unit">%</span></div>' +
      '</div>' +
      '<div class="card w-full text-center">' +
        '<p class="text-muted mb-1">Duration</p>' +
        '<div class="speed-display" id="qs-time-display" style="font-size:3.5rem;">10:00</div>' +
      '</div>' +
      '<div class="quick-start-controls">' +
        '<button class="btn btn-success btn-lg" id="qs-start-btn" style="min-width:200px;">START</button>' +
      '</div>' +
    '</div>';
  }

  function screenCustomPrograms() {
    var rows = '';
    for (var i = 0; i < 10; i++) {
      rows += '<tr>' +
        '<td class="step-row-num">' + (i + 1) + '</td>' +
        '<td><input type="number" class="form-input" data-field="speed" data-row="' + i + '" value="" min="0" max="100" placeholder="0"></td>' +
        '<td><input type="number" class="form-input" data-field="duration" data-row="' + i + '" value="" min="0" placeholder="0"></td>' +
      '</tr>';
    }

    return '<div class="screen-header">' +
      '<h1 class="screen-title">Custom Programs</h1>' +
      '<div class="header-actions">' +
        '<button class="btn btn-ghost btn-sm" id="cp-new-btn">New</button>' +
        '<button class="btn btn-primary btn-sm" id="cp-save-btn">Save</button>' +
      '</div>' +
    '</div>' +
    '<div class="program-layout">' +
      '<div class="card">' +
        '<div class="form-group">' +
          '<label class="form-label">Program Name</label>' +
          '<input type="text" class="form-input" id="cp-name" placeholder="My Program">' +
        '</div>' +
        '<div class="form-group">' +
          '<label class="form-label">Sets</label>' +
          '<input type="number" class="form-input" id="cp-sets" value="1" min="1" max="99" style="max-width:100px;">' +
        '</div>' +
        '<div style="overflow-x:auto;">' +
          '<table class="step-table">' +
            '<thead><tr><th>#</th><th>Speed (%)</th><th>Duration (sec)</th></tr></thead>' +
            '<tbody id="cp-steps">' + rows + '</tbody>' +
          '</table>' +
        '</div>' +
        '<div class="mt-2 d-flex gap-sm">' +
          '<button class="btn btn-success btn-sm" id="cp-run-btn">Run Program</button>' +
        '</div>' +
      '</div>' +
      '<div class="program-sidebar">' +
        '<div class="card">' +
          '<div class="card-title">Library</div>' +
          '<div class="program-list" id="cp-library">Loading...</div>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  function screenInterval() {
    return '<div class="screen-header">' +
      '<h1 class="screen-title">Interval Training</h1>' +
    '</div>' +
    '<div class="interval-layout">' +
      '<div class="card text-center">' +
        '<p class="text-muted mb-1">Sets</p>' +
        '<div class="speed-display" id="iv-sets-display" style="font-size:3rem;">5</div>' +
      '</div>' +
      '<div class="interval-steps">' +
        '<div class="interval-step-card">' +
          '<div class="interval-step-label">Step 1 — High</div>' +
          '<div class="interval-step-value" id="iv-s1-speed">70</div>' +
          '<p class="text-muted text-sm mt-1">Speed %</p>' +
          '<div class="interval-step-value" id="iv-s1-dur" style="font-size:1.5rem;margin-top:0.5rem;">0:30</div>' +
          '<p class="text-muted text-xs">Duration</p>' +
        '</div>' +
        '<div class="interval-step-card">' +
          '<div class="interval-step-label">Step 2 — Low</div>' +
          '<div class="interval-step-value" id="iv-s2-speed">30</div>' +
          '<p class="text-muted text-sm mt-1">Speed %</p>' +
          '<div class="interval-step-value" id="iv-s2-dur" style="font-size:1.5rem;margin-top:0.5rem;">0:30</div>' +
          '<p class="text-muted text-xs">Duration</p>' +
        '</div>' +
      '</div>' +
      '<button class="btn btn-success btn-lg btn-block" id="iv-start-btn">START INTERVALS</button>' +
    '</div>';
  }

  function screenPreset(type) {
    var title = type === 'distance' ? 'Distance Training' : 'Sprint Training';
    var levels = [
      { level: 'beginner', label: 'Beginner', desc: type === 'distance' ? 'Easy pace, longer duration for building endurance' : 'Moderate sprints with generous rest periods', speed: type === 'distance' ? '30-40%' : '50-60%', duration: type === 'distance' ? '20 min' : '10 min' },
      { level: 'intermediate', label: 'Intermediate', desc: type === 'distance' ? 'Moderate pace with sustained effort' : 'Faster sprints with moderate recovery', speed: type === 'distance' ? '45-55%' : '65-75%', duration: type === 'distance' ? '30 min' : '15 min' },
      { level: 'advanced', label: 'Advanced', desc: type === 'distance' ? 'High pace challenging workout for experienced swimmers' : 'Maximum intensity sprints with short recovery', speed: type === 'distance' ? '60-75%' : '80-95%', duration: type === 'distance' ? '45 min' : '20 min' }
    ];

    var cards = levels.map(function (l) {
      return '<div class="preset-card" data-type="' + type + '" data-level="' + l.level + '">' +
        '<div class="preset-level">' + l.label + '</div>' +
        '<div class="preset-card-title">' + l.label + ' ' + title.split(' ')[0] + '</div>' +
        '<div class="preset-card-desc">' + l.desc + '</div>' +
        '<div class="preset-card-stats">' +
          '<div><span class="preset-stat-value">' + l.speed + '</span>Speed</div>' +
          '<div><span class="preset-stat-value">' + l.duration + '</span>Duration</div>' +
        '</div>' +
      '</div>';
    }).join('');

    return '<div class="screen-header">' +
      '<h1 class="screen-title">' + title + '</h1>' +
    '</div>' +
    '<div class="preset-grid">' + cards + '</div>';
  }

  function screenExecution() {
    return '<div class="execution-layout">' +
      '<div class="gauge-container" id="exec-gauge"></div>' +
      '<div class="timer-container" id="exec-timer"></div>' +
      '<div class="step-container" id="exec-steps"></div>' +
      '<div class="ctrl-container" id="exec-ctrl"></div>' +
    '</div>';
  }

  function screenProfile() {
    return '<div class="profile-layout">' +
      '<div class="card profile-header-card">' +
        '<div class="profile-avatar" id="prof-avatar">?</div>' +
        '<div class="profile-info">' +
          '<h2 id="prof-name">Loading...</h2>' +
          '<p id="prof-role">-</p>' +
        '</div>' +
        '<div style="margin-left:auto;">' +
          '<button class="btn btn-ghost btn-sm" id="prof-logout-btn">' + icon('logout') + ' Logout</button>' +
        '</div>' +
      '</div>' +
      '<div class="stats-grid" id="prof-stats"></div>' +
      '<div class="card">' +
        '<div class="card-title">Workout History</div>' +
        '<div id="prof-history" style="overflow-x:auto;">Loading...</div>' +
      '</div>' +
    '</div>';
  }

  function screenAdmin() {
    var tabs = ['dashboard', 'users', 'devices', 'communication', 'tags', 'graphics', 'layouts', 'audit'];
    var activeTab = currentParams[0] || 'dashboard';

    var tabsHtml = tabs.map(function (t) {
      return '<button class="admin-tab' + (t === activeTab ? ' active' : '') +
        '" data-tab="' + t + '">' + t.charAt(0).toUpperCase() + t.slice(1) + '</button>';
    }).join('');

    return '<div class="screen-header">' +
      '<h1 class="screen-title">Admin Panel</h1>' +
    '</div>' +
    '<div class="admin-tabs">' + tabsHtml + '</div>' +
    '<div class="admin-content" id="admin-content">Loading...</div>';
  }

  // ============ Screen Initializers (event binding) ============
  function initLogin() {
    var form = $('#login-form');
    if (!form) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var errEl = $('#login-error');
      errEl.style.display = 'none';
      var fd = new FormData(form);
      EdgeAPI.login(fd.get('username'), fd.get('password'))
        .then(function () {
          toast('Logged in successfully', 'success');
          EdgeWebSocket.disconnect();
          EdgeWebSocket.connect();
          navigate('home');
        })
        .catch(function (err) {
          errEl.textContent = err.message || 'Login failed';
          errEl.style.display = 'block';
        });
    });
  }

  function initRegister() {
    var form = $('#register-form');
    if (!form) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var errEl = $('#register-error');
      errEl.style.display = 'none';
      var fd = new FormData(form);
      EdgeAPI.register(fd.get('username'), fd.get('password'), fd.get('displayName'))
        .then(function () {
          toast('Account created successfully', 'success');
          EdgeWebSocket.disconnect();
          EdgeWebSocket.connect();
          navigate('home');
        })
        .catch(function (err) {
          errEl.textContent = err.message || 'Registration failed';
          errEl.style.display = 'block';
        });
    });
  }

  var qsSpeed = 50;
  var qsTimeSec = 600;

  function initQuickStart() {
    var speedEl = $('#qs-speed-display');
    var timeEl = $('#qs-time-display');
    var startBtn = $('#qs-start-btn');

    function updateQsDisplay() {
      if (speedEl) speedEl.innerHTML = qsSpeed + '<span class="speed-display-unit">%</span>';
      if (timeEl) timeEl.textContent = WorkoutUI.formatTime(qsTimeSec * 1000);
    }
    updateQsDisplay();

    if (speedEl) {
      speedEl.addEventListener('click', function () {
        WorkoutUI.renderNumericKeypad(function (val) {
          qsSpeed = Math.max(0, Math.min(100, val));
          updateQsDisplay();
        }, { title: 'Set Speed (%)', initial: qsSpeed, maxLen: 3 });
      });
    }

    if (timeEl) {
      timeEl.addEventListener('click', function () {
        WorkoutUI.renderNumericKeypad(function (totalSec) {
          qsTimeSec = Math.max(0, totalSec);
          updateQsDisplay();
        }, { title: 'Set Duration (MM:SS)', mode: 'time', initial: '', maxLen: 4 });
      });
    }

    if (startBtn) {
      startBtn.addEventListener('click', function () {
        startBtn.disabled = true;
        EdgeAPI.quickStart(qsSpeed, qsTimeSec * 1000)
          .then(function () {
            toast('Workout started', 'success');
            navigate('execution');
          })
          .catch(function (err) {
            toast(err.message || 'Failed to start', 'error');
            startBtn.disabled = false;
          });
      });
    }
  }

  var cpEditId = null;

  function initCustomPrograms() {
    loadProgramLibrary();

    $('#cp-new-btn').addEventListener('click', function () {
      cpEditId = null;
      $('#cp-name').value = '';
      $('#cp-sets').value = '1';
      $$('#cp-steps input').forEach(function (inp) { inp.value = ''; });
    });

    $('#cp-save-btn').addEventListener('click', function () {
      var name = $('#cp-name').value.trim();
      if (!name) { toast('Enter a program name', 'warning'); return; }
      var sets = parseInt($('#cp-sets').value) || 1;
      var steps = collectSteps();
      if (steps.length === 0) { toast('Add at least one step', 'warning'); return; }

      var data = { name: name, sets: sets, steps: steps };
      var promise = cpEditId
        ? EdgeAPI.updateProgram(cpEditId, data)
        : EdgeAPI.createProgram(data);

      promise.then(function () {
        toast('Program saved', 'success');
        loadProgramLibrary();
      }).catch(function (err) { toast(err.message || 'Save failed', 'error'); });
    });

    $('#cp-run-btn').addEventListener('click', function () {
      var steps = collectSteps();
      if (steps.length === 0) { toast('Add at least one step', 'warning'); return; }

      if (cpEditId) {
        EdgeAPI.startProgram(cpEditId)
          .then(function () { navigate('execution'); })
          .catch(function (err) { toast(err.message || 'Failed', 'error'); });
      } else {
        var name = $('#cp-name').value.trim() || 'Untitled';
        var sets = parseInt($('#cp-sets').value) || 1;
        EdgeAPI.createProgram({ name: name, sets: sets, steps: steps })
          .then(function (prog) {
            return EdgeAPI.startProgram(prog.id || prog._id);
          })
          .then(function () { navigate('execution'); })
          .catch(function (err) { toast(err.message || 'Failed', 'error'); });
      }
    });
  }

  function collectSteps() {
    var steps = [];
    for (var i = 0; i < 10; i++) {
      var speedInput = $('[data-field="speed"][data-row="' + i + '"]');
      var durInput = $('[data-field="duration"][data-row="' + i + '"]');
      var speed = parseFloat(speedInput ? speedInput.value : '');
      var dur = parseFloat(durInput ? durInput.value : '');
      if (!isNaN(speed) && speed > 0 && !isNaN(dur) && dur > 0) {
        steps.push({ speed: speed, durationSec: dur });
      }
    }
    return steps;
  }

  function loadProgramLibrary() {
    var lib = $('#cp-library');
    if (!lib) return;
    lib.innerHTML = 'Loading...';
    EdgeAPI.listPrograms()
      .then(function (programs) {
        var list = Array.isArray(programs) ? programs : (programs && programs.programs) || [];
        if (list.length === 0) {
          lib.innerHTML = '<div class="empty-state"><p class="text-muted">No saved programs</p></div>';
          return;
        }
        lib.innerHTML = list.map(function (p) {
          return '<div class="program-item" data-id="' + (p.id || p._id) + '">' +
            '<span class="program-item-name">' + escapeHtml(p.name) + '</span>' +
            '<div class="program-item-actions">' +
              '<button class="btn btn-sm btn-primary" data-load="' + (p.id || p._id) + '">Load</button>' +
              '<button class="btn btn-sm btn-danger" data-del="' + (p.id || p._id) + '">&#x2715;</button>' +
            '</div>' +
          '</div>';
        }).join('');

        $$('[data-load]', lib).forEach(function (btn) {
          btn.addEventListener('click', function () { loadProgramIntoEditor(btn.getAttribute('data-load')); });
        });
        $$('[data-del]', lib).forEach(function (btn) {
          btn.addEventListener('click', function () {
            var id = btn.getAttribute('data-del');
            confirmDialog('Delete Program', 'Are you sure you want to delete this program?')
              .then(function (ok) {
                if (!ok) return;
                EdgeAPI.deleteProgram(id).then(function () {
                  toast('Program deleted', 'success');
                  loadProgramLibrary();
                }).catch(function (err) { toast(err.message, 'error'); });
              });
          });
        });
      })
      .catch(function () {
        lib.innerHTML = '<p class="text-muted">Login required to view programs</p>';
      });
  }

  function loadProgramIntoEditor(id) {
    EdgeAPI.getProgram(id).then(function (prog) {
      var p = prog.program || prog;
      cpEditId = p.id || p._id;
      $('#cp-name').value = p.name || '';
      $('#cp-sets').value = p.sets || 1;
      var steps = p.steps || [];
      for (var i = 0; i < 10; i++) {
        var speedInput = $('[data-field="speed"][data-row="' + i + '"]');
        var durInput = $('[data-field="duration"][data-row="' + i + '"]');
        if (i < steps.length) {
          if (speedInput) speedInput.value = steps[i].speed || '';
          if (durInput) durInput.value = steps[i].durationSec || steps[i].duration || '';
        } else {
          if (speedInput) speedInput.value = '';
          if (durInput) durInput.value = '';
        }
      }
      toast('Program loaded into editor', 'info');
    }).catch(function (err) { toast(err.message, 'error'); });
  }

  var ivSets = 5;
  var ivS1 = { speed: 70, durationSec: 30 };
  var ivS2 = { speed: 30, durationSec: 30 };

  function initInterval() {
    function updateIvDisplay() {
      var d = $('#iv-sets-display'); if (d) d.textContent = ivSets;
      var s1s = $('#iv-s1-speed'); if (s1s) s1s.textContent = ivS1.speed;
      var s1d = $('#iv-s1-dur'); if (s1d) s1d.textContent = WorkoutUI.formatTime(ivS1.durationSec * 1000);
      var s2s = $('#iv-s2-speed'); if (s2s) s2s.textContent = ivS2.speed;
      var s2d = $('#iv-s2-dur'); if (s2d) s2d.textContent = WorkoutUI.formatTime(ivS2.durationSec * 1000);
    }
    updateIvDisplay();

    function tapHandler(elId, cb) {
      var el = $(elId);
      if (el) el.addEventListener('click', cb);
    }

    tapHandler('#iv-sets-display', function () {
      WorkoutUI.renderNumericKeypad(function (v) {
        ivSets = Math.max(1, Math.min(99, Math.round(v)));
        updateIvDisplay();
      }, { title: 'Number of Sets', initial: ivSets, maxLen: 2, allowDot: false });
    });

    tapHandler('#iv-s1-speed', function () {
      WorkoutUI.renderNumericKeypad(function (v) {
        ivS1.speed = Math.max(0, Math.min(100, v));
        updateIvDisplay();
      }, { title: 'Step 1 Speed (%)', initial: ivS1.speed, maxLen: 3 });
    });

    tapHandler('#iv-s1-dur', function () {
      WorkoutUI.renderNumericKeypad(function (totalSec) {
        ivS1.durationSec = Math.max(1, totalSec);
        updateIvDisplay();
      }, { title: 'Step 1 Duration (MM:SS)', mode: 'time', maxLen: 4 });
    });

    tapHandler('#iv-s2-speed', function () {
      WorkoutUI.renderNumericKeypad(function (v) {
        ivS2.speed = Math.max(0, Math.min(100, v));
        updateIvDisplay();
      }, { title: 'Step 2 Speed (%)', initial: ivS2.speed, maxLen: 3 });
    });

    tapHandler('#iv-s2-dur', function () {
      WorkoutUI.renderNumericKeypad(function (totalSec) {
        ivS2.durationSec = Math.max(1, totalSec);
        updateIvDisplay();
      }, { title: 'Step 2 Duration (MM:SS)', mode: 'time', maxLen: 4 });
    });

    $('#iv-start-btn').addEventListener('click', function () {
      var btn = $('#iv-start-btn');
      btn.disabled = true;
      EdgeAPI.startInterval(ivSets, ivS1, ivS2)
        .then(function () {
          toast('Interval workout started', 'success');
          navigate('execution');
        })
        .catch(function (err) {
          toast(err.message || 'Failed to start', 'error');
          btn.disabled = false;
        });
    });
  }

  function initPreset(type) {
    $$('.preset-card').forEach(function (card) {
      card.addEventListener('click', function () {
        var level = card.getAttribute('data-level');
        EdgeAPI.startPreset(type, level)
          .then(function () {
            toast(type + ' workout started', 'success');
            navigate('execution');
          })
          .catch(function (err) { toast(err.message || 'Failed', 'error'); });
      });
    });
  }

  function initExecution() {
    var gaugeEl = $('#exec-gauge');
    var timerEl = $('#exec-timer');
    var stepEl = $('#exec-steps');
    var ctrlEl = $('#exec-ctrl');

    var w = activeWorkout || {};
    WorkoutUI.renderSpeedGauge(gaugeEl, w.currentSpeed || 0, w.maxSpeed || 100);
    WorkoutUI.renderTimer(timerEl, w.totalElapsedMs || w.elapsedMs || 0, w.totalDurationMs);
    var steps = w.steps || (w.program && w.program.steps) || [];
    WorkoutUI.renderStepProgress(stepEl, w.currentStepIndex || 0, Math.max(steps.length, 1), w.currentSet, w.totalSets);

    var callbacks = {
      onStart: function () {
        EdgeWebSocket.sendCommand('START');
      },
      onPause: function () {
        EdgeAPI.pause().then(function () { toast('Paused', 'info'); }).catch(function (err) { toast(err.message, 'error'); });
      },
      onResume: function () {
        EdgeAPI.resume().then(function () { toast('Resumed', 'info'); }).catch(function (err) { toast(err.message, 'error'); });
      },
      onStop: function () {
        confirmDialog('Stop Workout', 'Are you sure you want to stop the current workout?').then(function (ok) {
          if (!ok) return;
          EdgeAPI.stop().then(function () {
            activeWorkout = null;
            toast('Workout stopped', 'warning');
            navigate('home');
          }).catch(function (err) { toast(err.message, 'error'); });
        });
      },
      onSpeedUp: function () {
        EdgeAPI.adjustSpeed(5).catch(function (err) { toast(err.message, 'error'); });
      },
      onSpeedDown: function () {
        EdgeAPI.adjustSpeed(-5).catch(function (err) { toast(err.message, 'error'); });
      }
    };

    var state = (w.state || 'idle').toLowerCase();
    WorkoutUI.renderControlButtons(ctrlEl, state, callbacks);

    pollActiveWorkout();
  }

  function updateExecutionScreen(w) {
    if (!w) return;
    activeWorkout = w;

    if (currentRoute !== 'execution') return;

    var gaugeEl = $('#exec-gauge');
    var timerEl = $('#exec-timer');
    var stepEl = $('#exec-steps');
    var ctrlEl = $('#exec-ctrl');

    WorkoutUI.renderSpeedGauge(gaugeEl, w.currentSpeed || 0, w.maxSpeed || 100);
    WorkoutUI.updateTimer(timerEl, w.totalElapsedMs || w.elapsedMs || 0, w.totalDurationMs);
    var steps = w.steps || (w.program && w.program.steps) || [];
    WorkoutUI.updateStepProgress(stepEl, w.currentStepIndex || 0, Math.max(steps.length, 1), w.currentSet, w.totalSets);
    WorkoutUI.updateControlState(ctrlEl, (w.state || 'idle').toLowerCase());
  }

  function pollActiveWorkout() {
    if (workoutPollTimer) clearInterval(workoutPollTimer);
    workoutPollTimer = setInterval(function () {
      if (currentRoute !== 'execution') {
        clearInterval(workoutPollTimer);
        workoutPollTimer = null;
        return;
      }
      EdgeAPI.getActive().then(function (w) {
        if (w && w.state && w.state !== 'IDLE' && w.state !== 'idle') {
          updateExecutionScreen(w);
        } else if (!activeWorkout || activeWorkout.state === 'COMPLETED' || activeWorkout.state === 'completed') {
          clearInterval(workoutPollTimer);
          workoutPollTimer = null;
          toast('Workout completed', 'success');
          navigate('home');
        }
      }).catch(function () {});
    }, 2000);
  }

  function initProfile() {
    var logoutBtn = $('#prof-logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', function () {
        EdgeAPI.logout();
        EdgeWebSocket.disconnect();
        toast('Logged out', 'info');
        navigate('home');
      });
    }

    EdgeAPI.getProfile().then(function (data) {
      var user = data.user || data;
      $('#prof-name').textContent = user.displayName || user.username || 'User';
      $('#prof-role').textContent = (user.role || 'user').replace('_', ' ');
      $('#prof-avatar').textContent = (user.displayName || user.username || '?')[0].toUpperCase();
    }).catch(function () {
      $('#prof-name').textContent = 'Guest';
      $('#prof-role').textContent = 'Not logged in';
    });

    EdgeAPI.getStats().then(function (stats) {
      var s = stats || {};
      var statsEl = $('#prof-stats');
      if (statsEl) {
        statsEl.innerHTML =
          statCard(s.totalWorkouts || 0, 'Workouts') +
          statCard(WorkoutUI.formatTimeDetailed((s.totalTimeMs || 0)), 'Total Time') +
          statCard(s.avgSpeed ? Math.round(s.avgSpeed) + '%' : '-', 'Avg Speed') +
          statCard(s.totalDistance || '-', 'Distance');
      }
    }).catch(function () {});

    EdgeAPI.getHistory(20, 0).then(function (data) {
      var history = Array.isArray(data) ? data : (data && data.history) || [];
      var el = $('#prof-history');
      if (!el) return;
      if (history.length === 0) {
        el.innerHTML = '<p class="text-muted">No workout history yet.</p>';
        return;
      }
      el.innerHTML = '<table class="history-table"><thead><tr>' +
        '<th>Date</th><th>Type</th><th>Duration</th><th>Speed</th>' +
        '</tr></thead><tbody>' +
        history.map(function (h) {
          var date = h.createdAt ? new Date(h.createdAt).toLocaleDateString() : '-';
          return '<tr>' +
            '<td>' + date + '</td>' +
            '<td>' + escapeHtml(h.type || h.mode || '-') + '</td>' +
            '<td>' + WorkoutUI.formatTime(h.durationMs || h.totalElapsedMs || 0) + '</td>' +
            '<td>' + (h.avgSpeed != null ? Math.round(h.avgSpeed) + '%' : '-') + '</td>' +
          '</tr>';
        }).join('') +
        '</tbody></table>';
    }).catch(function () {
      var el = $('#prof-history');
      if (el) el.innerHTML = '<p class="text-muted">Unable to load history.</p>';
    });
  }

  function statCard(value, label) {
    return '<div class="stat-card">' +
      '<div class="stat-value">' + value + '</div>' +
      '<div class="stat-label">' + label + '</div>' +
    '</div>';
  }

  // ============ Admin Sub-tabs ============
  function initAdmin() {
    $$('.admin-tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        navigate('admin/' + tab.getAttribute('data-tab'));
      });
    });

    var activeTab = currentParams[0] || 'dashboard';
    loadAdminTab(activeTab);
  }

  function loadAdminTab(tab) {
    var content = $('#admin-content');
    if (!content) return;

    content.innerHTML = '<p class="text-muted">Loading...</p>';

    switch (tab) {
      case 'dashboard': loadAdminDashboard(content); break;
      case 'users': loadAdminUsers(content); break;
      case 'devices': loadAdminDevices(content); break;
      case 'communication': loadAdminComm(content); break;
      case 'tags': loadAdminTags(content); break;
      case 'graphics': loadAdminGraphics(content); break;
      case 'layouts': loadAdminLayouts(content); break;
      case 'audit': loadAdminAudit(content); break;
      default: content.innerHTML = '<p>Select a tab.</p>';
    }
  }

  function loadAdminDashboard(el) {
    EdgeAPI.getDashboard().then(function (d) {
      var data = d || {};
      el.innerHTML = '<div class="admin-grid">' +
        adminStatCard('Users', data.userCount || data.users || 0) +
        adminStatCard('Devices', data.deviceCount || data.devices || 0) +
        adminStatCard('Active Workouts', data.activeWorkouts || 0) +
        adminStatCard('Total Workouts', data.totalWorkouts || 0) +
        adminStatCard('Uptime', data.uptime || '-') +
        adminStatCard('Version', data.version || '-') +
      '</div>';
    }).catch(function (err) {
      el.innerHTML = '<p class="text-muted">Failed to load dashboard: ' + escapeHtml(err.message) + '</p>';
    });
  }

  function adminStatCard(label, value) {
    return '<div class="admin-section"><div class="admin-stat">' +
      '<div class="admin-stat-value">' + escapeHtml(String(value)) + '</div>' +
      '<div class="admin-stat-label">' + escapeHtml(label) + '</div>' +
    '</div></div>';
  }

  function loadAdminUsers(el) {
    EdgeAPI.listUsers().then(function (data) {
      var users = Array.isArray(data) ? data : (data && data.users) || [];
      el.innerHTML = '<div class="d-flex justify-between items-center mb-2">' +
        '<h3>Users (' + users.length + ')</h3>' +
        '<button class="btn btn-sm btn-primary" id="admin-add-user">Add User</button>' +
      '</div>' +
      '<div style="overflow-x:auto;"><table class="admin-table"><thead><tr>' +
        '<th>Username</th><th>Display Name</th><th>Role</th><th>Status</th><th>Actions</th>' +
      '</tr></thead><tbody>' +
      users.map(function (u) {
        var uid = u.id || u._id;
        var disabled = u.disabled || u.status === 'disabled';
        return '<tr>' +
          '<td>' + escapeHtml(u.username) + '</td>' +
          '<td>' + escapeHtml(u.displayName || '-') + '</td>' +
          '<td><span class="badge badge-info">' + escapeHtml(u.role || 'user') + '</span></td>' +
          '<td>' + (disabled ? '<span class="badge badge-danger">Disabled</span>' : '<span class="badge badge-success">Active</span>') + '</td>' +
          '<td class="d-flex gap-sm">' +
            '<select class="form-input" style="min-height:36px;padding:0.25rem;font-size:0.8rem;max-width:120px;" data-role-sel="' + uid + '">' +
              roleOption('user', u.role) + roleOption('admin', u.role) + roleOption('super_admin', u.role) +
            '</select>' +
            (disabled
              ? '<button class="btn btn-sm btn-success" data-enable="' + uid + '">Enable</button>'
              : '<button class="btn btn-sm btn-warning" data-disable="' + uid + '">Disable</button>') +
            '<button class="btn btn-sm btn-danger" data-del-user="' + uid + '">Delete</button>' +
          '</td>' +
        '</tr>';
      }).join('') +
      '</tbody></table></div>';

      $$('[data-role-sel]', el).forEach(function (sel) {
        sel.addEventListener('change', function () {
          EdgeAPI.updateRole(sel.getAttribute('data-role-sel'), sel.value)
            .then(function () { toast('Role updated', 'success'); })
            .catch(function (err) { toast(err.message, 'error'); });
        });
      });

      $$('[data-disable]', el).forEach(function (btn) {
        btn.addEventListener('click', function () {
          EdgeAPI.disableUser(btn.getAttribute('data-disable'))
            .then(function () { toast('User disabled', 'success'); loadAdminUsers(el); })
            .catch(function (err) { toast(err.message, 'error'); });
        });
      });

      $$('[data-enable]', el).forEach(function (btn) {
        btn.addEventListener('click', function () {
          EdgeAPI.enableUser(btn.getAttribute('data-enable'))
            .then(function () { toast('User enabled', 'success'); loadAdminUsers(el); })
            .catch(function (err) { toast(err.message, 'error'); });
        });
      });

      $$('[data-del-user]', el).forEach(function (btn) {
        btn.addEventListener('click', function () {
          confirmDialog('Delete User', 'This action cannot be undone.').then(function (ok) {
            if (!ok) return;
            EdgeAPI.deleteUser(btn.getAttribute('data-del-user'))
              .then(function () { toast('User deleted', 'success'); loadAdminUsers(el); })
              .catch(function (err) { toast(err.message, 'error'); });
          });
        });
      });

      var addBtn = $('#admin-add-user');
      if (addBtn) {
        addBtn.addEventListener('click', function () { showAddUserDialog(el); });
      }
    }).catch(function (err) {
      el.innerHTML = '<p class="text-muted">Failed to load users: ' + escapeHtml(err.message) + '</p>';
    });
  }

  function roleOption(role, current) {
    return '<option value="' + role + '"' + (current === role ? ' selected' : '') + '>' + role.replace('_', ' ') + '</option>';
  }

  function showAddUserDialog(parentEl) {
    var overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = '<div class="modal">' +
      '<div class="modal-title">Add User</div>' +
      '<div class="modal-body">' +
        '<div class="form-group"><label class="form-label">Username</label><input type="text" class="form-input" id="add-user-name"></div>' +
        '<div class="form-group"><label class="form-label">Password</label><input type="password" class="form-input" id="add-user-pass"></div>' +
        '<div class="form-group"><label class="form-label">Role</label>' +
          '<select class="form-input" id="add-user-role"><option value="user">User</option><option value="admin">Admin</option></select></div>' +
      '</div>' +
      '<div class="modal-actions">' +
        '<button class="btn btn-ghost" data-action="cancel">Cancel</button>' +
        '<button class="btn btn-primary" data-action="save">Create</button>' +
      '</div></div>';

    overlay.querySelector('[data-action="cancel"]').addEventListener('click', function () { overlay.remove(); });
    overlay.querySelector('[data-action="save"]').addEventListener('click', function () {
      var username = $('#add-user-name').value.trim();
      var password = $('#add-user-pass').value;
      var role = $('#add-user-role').value;
      if (!username || !password) { toast('Fill all fields', 'warning'); return; }
      EdgeAPI.createUser({ username: username, password: password, role: role })
        .then(function () { overlay.remove(); toast('User created', 'success'); loadAdminUsers(parentEl); })
        .catch(function (err) { toast(err.message, 'error'); });
    });
    overlay.addEventListener('click', function (e) { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
  }

  function loadAdminDevices(el) {
    EdgeAPI.listDevices().then(function (data) {
      var devices = Array.isArray(data) ? data : (data && data.devices) || [];
      el.innerHTML = '<div class="d-flex justify-between items-center mb-2">' +
        '<h3>Devices (' + devices.length + ')</h3>' +
        '<button class="btn btn-sm btn-primary" id="admin-add-device">Register Device</button>' +
      '</div>' +
      '<div style="overflow-x:auto;"><table class="admin-table"><thead><tr>' +
        '<th>Name</th><th>MAC</th><th>Type</th><th>Actions</th>' +
      '</tr></thead><tbody>' +
      devices.map(function (d) {
        var did = d.id || d._id;
        return '<tr>' +
          '<td>' + escapeHtml(d.deviceName || d.name || '-') + '</td>' +
          '<td><code>' + escapeHtml(d.macAddress || d.mac || '-') + '</code></td>' +
          '<td>' + escapeHtml(d.deviceType || d.type || '-') + '</td>' +
          '<td><button class="btn btn-sm btn-danger" data-revoke="' + did + '">Revoke</button></td>' +
        '</tr>';
      }).join('') +
      '</tbody></table></div>';

      $$('[data-revoke]', el).forEach(function (btn) {
        btn.addEventListener('click', function () {
          confirmDialog('Revoke Device', 'This device will no longer be authorized.').then(function (ok) {
            if (!ok) return;
            EdgeAPI.revokeDevice(btn.getAttribute('data-revoke'))
              .then(function () { toast('Device revoked', 'success'); loadAdminDevices(el); })
              .catch(function (err) { toast(err.message, 'error'); });
          });
        });
      });

      var addBtn = $('#admin-add-device');
      if (addBtn) {
        addBtn.addEventListener('click', function () {
          var overlay = document.createElement('div');
          overlay.className = 'modal-overlay';
          overlay.innerHTML = '<div class="modal">' +
            '<div class="modal-title">Register Device</div>' +
            '<div class="modal-body">' +
              '<div class="form-group"><label class="form-label">MAC Address</label><input type="text" class="form-input" id="dev-mac" placeholder="AA:BB:CC:DD:EE:FF"></div>' +
              '<div class="form-group"><label class="form-label">Device Name</label><input type="text" class="form-input" id="dev-name" placeholder="Tablet 1"></div>' +
              '<div class="form-group"><label class="form-label">Type</label>' +
                '<select class="form-input" id="dev-type"><option value="TABLET">Tablet</option><option value="DESKTOP">Desktop</option><option value="MOBILE">Mobile</option></select></div>' +
            '</div>' +
            '<div class="modal-actions">' +
              '<button class="btn btn-ghost" data-action="cancel">Cancel</button>' +
              '<button class="btn btn-primary" data-action="save">Register</button>' +
            '</div></div>';
          overlay.querySelector('[data-action="cancel"]').addEventListener('click', function () { overlay.remove(); });
          overlay.querySelector('[data-action="save"]').addEventListener('click', function () {
            EdgeAPI.registerDevice($('#dev-mac').value, $('#dev-name').value, $('#dev-type').value)
              .then(function () { overlay.remove(); toast('Device registered', 'success'); loadAdminDevices(el); })
              .catch(function (err) { toast(err.message, 'error'); });
          });
          overlay.addEventListener('click', function (e) { if (e.target === overlay) overlay.remove(); });
          document.body.appendChild(overlay);
        });
      }
    }).catch(function (err) {
      el.innerHTML = '<p class="text-muted">Failed: ' + escapeHtml(err.message) + '</p>';
    });
  }

  function loadAdminComm(el) {
    EdgeAPI.listCommConfigs().then(function (data) {
      var configs = Array.isArray(data) ? data : (data && data.configs) || [];
      if (configs.length === 0) {
        el.innerHTML = '<div class="empty-state"><div class="empty-state-icon">&#x1F4E1;</div>' +
          '<p class="empty-state-text">No communication configurations</p></div>';
        return;
      }
      el.innerHTML = '<table class="admin-table"><thead><tr><th>Protocol</th><th>Host</th><th>Status</th></tr></thead><tbody>' +
        configs.map(function (c) {
          return '<tr><td>' + escapeHtml(c.protocol || c.type || '-') + '</td>' +
            '<td>' + escapeHtml(c.host || c.address || '-') + '</td>' +
            '<td><span class="badge ' + (c.connected ? 'badge-success' : 'badge-danger') + '">' +
            (c.connected ? 'Connected' : 'Disconnected') + '</span></td></tr>';
        }).join('') + '</tbody></table>';
    }).catch(function (err) {
      el.innerHTML = '<p class="text-muted">Failed: ' + escapeHtml(err.message) + '</p>';
    });
  }

  function loadAdminTags(el) {
    EdgeAPI.listTagMappings().then(function (data) {
      var tags = Array.isArray(data) ? data : (data && data.tags) || [];
      el.innerHTML = '<div class="d-flex justify-between items-center mb-2">' +
        '<h3>Tag Mappings (' + tags.length + ')</h3>' +
        '<button class="btn btn-sm btn-primary" id="admin-add-tag">Add Mapping</button>' +
      '</div>' +
      (tags.length === 0
        ? '<p class="text-muted">No tag mappings configured.</p>'
        : '<table class="admin-table"><thead><tr><th>Tag</th><th>Description</th><th>Actions</th></tr></thead><tbody>' +
          tags.map(function (t) {
            return '<tr><td><code>' + escapeHtml(t.tag || t.name || '-') + '</code></td>' +
              '<td>' + escapeHtml(t.description || '-') + '</td>' +
              '<td><button class="btn btn-sm btn-danger" data-del-tag="' + (t.id || t._id) + '">Delete</button></td></tr>';
          }).join('') + '</tbody></table>');

      $$('[data-del-tag]', el).forEach(function (btn) {
        btn.addEventListener('click', function () {
          EdgeAPI.deleteTagMapping(btn.getAttribute('data-del-tag'))
            .then(function () { toast('Deleted', 'success'); loadAdminTags(el); })
            .catch(function (err) { toast(err.message, 'error'); });
        });
      });

      var addBtn = $('#admin-add-tag');
      if (addBtn) {
        addBtn.addEventListener('click', function () {
          var overlay = document.createElement('div');
          overlay.className = 'modal-overlay';
          overlay.innerHTML = '<div class="modal"><div class="modal-title">Add Tag Mapping</div><div class="modal-body">' +
            '<div class="form-group"><label class="form-label">Tag Name</label><input type="text" class="form-input" id="tag-name"></div>' +
            '<div class="form-group"><label class="form-label">Description</label><input type="text" class="form-input" id="tag-desc"></div>' +
            '</div><div class="modal-actions"><button class="btn btn-ghost" data-action="cancel">Cancel</button>' +
            '<button class="btn btn-primary" data-action="save">Add</button></div></div>';
          overlay.querySelector('[data-action="cancel"]').addEventListener('click', function () { overlay.remove(); });
          overlay.querySelector('[data-action="save"]').addEventListener('click', function () {
            EdgeAPI.createTagMapping({ tag: $('#tag-name').value, description: $('#tag-desc').value })
              .then(function () { overlay.remove(); toast('Tag added', 'success'); loadAdminTags(el); })
              .catch(function (err) { toast(err.message, 'error'); });
          });
          overlay.addEventListener('click', function (e) { if (e.target === overlay) overlay.remove(); });
          document.body.appendChild(overlay);
        });
      }
    }).catch(function (err) {
      el.innerHTML = '<p class="text-muted">Failed: ' + escapeHtml(err.message) + '</p>';
    });
  }

  function loadAdminGraphics(el) {
    EdgeAPI.listGraphics().then(function (data) {
      var items = Array.isArray(data) ? data : (data && data.graphics) || [];
      el.innerHTML = '<div class="d-flex justify-between items-center mb-2">' +
        '<h3>Graphics (' + items.length + ')</h3>' +
        '<label class="btn btn-sm btn-primary" style="cursor:pointer;">Upload<input type="file" id="gfx-upload" accept="image/*" style="display:none;"></label>' +
      '</div>' +
      (items.length === 0
        ? '<p class="text-muted">No graphics uploaded.</p>'
        : '<div class="admin-grid">' + items.map(function (g) {
            return '<div class="admin-section" style="text-align:center;">' +
              '<img src="' + (g.url || g.path || '') + '" alt="' + escapeHtml(g.name || '') + '" style="max-width:100%;max-height:120px;border-radius:var(--radius-sm);margin-bottom:0.5rem;">' +
              '<p class="text-sm">' + escapeHtml(g.name || g.filename || '-') + '</p>' +
              '<button class="btn btn-sm btn-danger mt-1" data-del-gfx="' + (g.id || g._id) + '">Delete</button>' +
            '</div>';
          }).join('') + '</div>');

      var fileInput = $('#gfx-upload');
      if (fileInput) {
        fileInput.addEventListener('change', function () {
          if (!fileInput.files.length) return;
          var fd = new FormData();
          fd.append('file', fileInput.files[0]);
          EdgeAPI.uploadGraphic(fd)
            .then(function () { toast('Uploaded', 'success'); loadAdminGraphics(el); })
            .catch(function (err) { toast(err.message, 'error'); });
        });
      }

      $$('[data-del-gfx]', el).forEach(function (btn) {
        btn.addEventListener('click', function () {
          confirmDialog('Delete Graphic', 'Remove this graphic?').then(function (ok) {
            if (!ok) return;
            EdgeAPI.deleteGraphic(btn.getAttribute('data-del-gfx'))
              .then(function () { toast('Deleted', 'success'); loadAdminGraphics(el); })
              .catch(function (err) { toast(err.message, 'error'); });
          });
        });
      });
    }).catch(function (err) {
      el.innerHTML = '<p class="text-muted">Failed: ' + escapeHtml(err.message) + '</p>';
    });
  }

  function loadAdminLayouts(el) {
    EdgeAPI.listLayouts().then(function (data) {
      var layouts = Array.isArray(data) ? data : (data && data.layouts) || [];
      el.innerHTML = '<div class="d-flex justify-between items-center mb-2">' +
        '<h3>Layouts (' + layouts.length + ')</h3>' +
        '<button class="btn btn-sm btn-primary" id="admin-add-layout">Create Layout</button>' +
      '</div>' +
      (layouts.length === 0
        ? '<p class="text-muted">No layouts configured.</p>'
        : '<table class="admin-table"><thead><tr><th>Name</th><th>Status</th><th>Actions</th></tr></thead><tbody>' +
          layouts.map(function (l) {
            return '<tr><td>' + escapeHtml(l.name || '-') + '</td>' +
              '<td>' + (l.published || l.active ? '<span class="badge badge-success">Published</span>' : '<span class="badge badge-neutral">Draft</span>') + '</td>' +
              '<td><button class="btn btn-sm btn-primary" data-pub-layout="' + (l.id || l._id) + '">Publish</button></td></tr>';
          }).join('') + '</tbody></table>');

      $$('[data-pub-layout]', el).forEach(function (btn) {
        btn.addEventListener('click', function () {
          EdgeAPI.publishLayout(btn.getAttribute('data-pub-layout'))
            .then(function () { toast('Published', 'success'); loadAdminLayouts(el); })
            .catch(function (err) { toast(err.message, 'error'); });
        });
      });

      var addBtn = $('#admin-add-layout');
      if (addBtn) {
        addBtn.addEventListener('click', function () {
          var name = prompt('Layout name:');
          if (!name) return;
          EdgeAPI.createLayout({ name: name })
            .then(function () { toast('Created', 'success'); loadAdminLayouts(el); })
            .catch(function (err) { toast(err.message, 'error'); });
        });
      }
    }).catch(function (err) {
      el.innerHTML = '<p class="text-muted">Failed: ' + escapeHtml(err.message) + '</p>';
    });
  }

  function loadAdminAudit(el) {
    EdgeAPI.getAuditLog({ limit: 50 }).then(function (data) {
      var logs = Array.isArray(data) ? data : (data && data.logs) || [];
      if (logs.length === 0) {
        el.innerHTML = '<p class="text-muted">No audit log entries.</p>';
        return;
      }
      el.innerHTML = '<div style="overflow-x:auto;"><table class="admin-table"><thead><tr>' +
        '<th>Time</th><th>User</th><th>Action</th><th>Details</th>' +
      '</tr></thead><tbody>' +
      logs.map(function (l) {
        var time = l.timestamp || l.createdAt ? new Date(l.timestamp || l.createdAt).toLocaleString() : '-';
        return '<tr><td class="text-sm">' + escapeHtml(time) + '</td>' +
          '<td>' + escapeHtml(l.username || l.userId || '-') + '</td>' +
          '<td><span class="badge badge-info">' + escapeHtml(l.action || '-') + '</span></td>' +
          '<td class="text-sm">' + escapeHtml(l.details || l.message || '-') + '</td></tr>';
      }).join('') + '</tbody></table></div>';
    }).catch(function (err) {
      el.innerHTML = '<p class="text-muted">Failed: ' + escapeHtml(err.message) + '</p>';
    });
  }

  // ============ Main Render ============
  function renderApp() {
    if (!appEl) return;

    var screenHtml;
    switch (currentRoute) {
      case 'home': screenHtml = screenHome(); break;
      case 'login': screenHtml = screenLogin(); break;
      case 'register': screenHtml = screenRegister(); break;
      case 'quick-start': screenHtml = screenQuickStart(); break;
      case 'custom-programs': screenHtml = screenCustomPrograms(); break;
      case 'interval': screenHtml = screenInterval(); break;
      case 'distance': screenHtml = screenPreset('distance'); break;
      case 'sprint': screenHtml = screenPreset('sprint'); break;
      case 'execution': screenHtml = screenExecution(); break;
      case 'profile': screenHtml = screenProfile(); break;
      case 'admin': screenHtml = screenAdmin(); break;
      default: screenHtml = screenHome(); currentRoute = 'home';
    }

    appEl.innerHTML = renderNav() + renderConnectionDot() +
      '<main class="main-content"><div class="screen active">' + screenHtml + '</div></main>';

    var themeBtn = $('#theme-toggle-btn');
    if (themeBtn) themeBtn.addEventListener('click', toggleTheme);

    switch (currentRoute) {
      case 'login': initLogin(); break;
      case 'register': initRegister(); break;
      case 'quick-start': initQuickStart(); break;
      case 'custom-programs': initCustomPrograms(); break;
      case 'interval': initInterval(); break;
      case 'distance': initPreset('distance'); break;
      case 'sprint': initPreset('sprint'); break;
      case 'execution': initExecution(); break;
      case 'profile': initProfile(); break;
      case 'admin': initAdmin(); break;
    }

    updateConnectionDot(EdgeWebSocket.getState());
  }

  // ============ WebSocket Event Handlers ============
  function setupWebSocket() {
    EdgeWebSocket.onConnectionStatusChange = function (state) {
      updateConnectionDot(state);
    };

    EdgeWebSocket.on('workout_update', function (payload) {
      var w = payload.workout || payload;
      if (w && w.state) {
        activeWorkout = w;
        var state = w.state.toLowerCase();
        if (state !== 'idle' && state !== 'completed' && state !== 'stopped') {
          if (currentRoute !== 'execution') {
            navigate('execution');
          }
          updateExecutionScreen(w);
        } else if (state === 'completed' || state === 'stopped') {
          activeWorkout = null;
          if (currentRoute === 'execution') {
            toast('Workout ' + state, state === 'completed' ? 'success' : 'info');
            navigate('home');
          }
        }
      }
    });

    EdgeWebSocket.on('safety_stop', function () {
      WorkoutUI.renderSafetyStopOverlay(true, 'Safety stop activated — pool has been stopped.');
    });

    EdgeWebSocket.on('error', function (payload) {
      if (payload && payload.message) {
        toast(payload.message, 'error');
      }
    });

    EdgeWebSocket.on('command_ack', function (payload) {
      if (payload && payload.command) {
        toast('Command acknowledged: ' + payload.command, 'info');
      }
    });

    EdgeWebSocket.on('command_error', function (payload) {
      if (payload && payload.message) {
        toast('Command error: ' + payload.message, 'error');
      }
    });
  }

  // ============ Splash Screen ============
  function hideSplash() {
    var splash = $('#splash');
    if (splash) {
      splash.classList.add('hidden');
      setTimeout(function () { if (splash.parentNode) splash.parentNode.removeChild(splash); }, 400);
    }
  }

  // ============ Boot ============
  function init() {
    setTheme(getTheme());

    appEl = document.getElementById('app');
    if (!appEl) return;

    handleRoute();
    window.addEventListener('hashchange', handleRoute);

    setupWebSocket();

    setTimeout(function () {
      EdgeWebSocket.connect();
    }, 100);

    setTimeout(function () {
      if (EdgeAPI.isLoggedIn()) {
        EdgeAPI.getActive().then(function (w) {
          if (w && w.state && w.state !== 'IDLE' && w.state !== 'idle') {
            activeWorkout = w;
            navigate('execution');
          }
        }).catch(function () {});
      }
    }, 500);

    setTimeout(hideSplash, 600);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return {
    navigate: navigate,
    toast: toast,
    confirmDialog: confirmDialog,
    toggleTheme: toggleTheme
  };
})();
