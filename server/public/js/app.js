/**
 * SwimEx EDGE — Main SPA Application
 * Hash router, screens, WebSocket, theme, workout execution
 */

(function () {
  'use strict';

  const ROUTES = [
    'home', 'login', 'register', 'quick-start', 'custom-programs', 'interval',
    'distance', 'sprint', 'profile', 'admin'
  ];

  let currentScreen = '';
  let workoutTickInterval = null;
  let lastWorkoutState = null;

  // --- Router ---
  function getHashRoute() {
    const hash = (window.location.hash || '#home').slice(1);
    const parts = hash.split('/');
    return { screen: parts[0] || 'home', params: parts.slice(1) };
  }

  function navigate(screen, params = []) {
    const path = [screen, ...params].filter(Boolean).join('/');
    window.location.hash = path;
  }

  function renderScreen(screenId, params) {
    const app = document.getElementById('app');
    if (!app) return;

    document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
    const screen = document.getElementById(`screen-${screenId}`);
    if (screen) screen.classList.add('active');

    currentScreen = screenId;

    document.querySelectorAll('.nav-item').forEach((a) => {
      a.classList.toggle('active', (a.getAttribute('href') || '').replace('#', '') === screenId);
    });

    // Screen-specific init
    if (typeof initScreens === 'object' && initScreens[screenId]) {
      initScreens[screenId](params);
    }
  }

  function handleHashChange() {
    const { screen, params } = getHashRoute();
    const valid = ROUTES.includes(screen);
    renderScreen(valid ? screen : 'home', params);
  }

  // --- Splash ---
  function hideSplash() {
    const splash = document.getElementById('splash');
    if (splash) {
      splash.classList.add('hidden');
      setTimeout(() => splash.remove(), 500);
    }
  }

  // --- DOM Build ---
  function buildApp() {
    const app = document.getElementById('app');
    if (!app) return;

    const splash = app.querySelector('#splash');
    if (splash) splash.id = 'splash';

    const shell = document.createElement('div');
    shell.className = 'app-shell';

    const status = document.createElement('div');
    status.id = 'connection-status';
    status.className = 'connection-status disconnected';
    status.innerHTML = '<span class="status-dot"></span><span>Connecting...</span>';
    shell.appendChild(status);

    const main = document.createElement('main');
    main.className = 'main-content';

    ROUTES.forEach((id) => {
      const div = document.createElement('div');
      div.id = `screen-${id}`;
      div.className = 'screen';
      div.dataset.screen = id;
      main.appendChild(div);
    });

    const nav = document.createElement('nav');
    nav.className = 'nav-bar';
    nav.innerHTML = `
      <a href="#home" class="nav-item" data-nav="home">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>
        Home
      </a>
      <a href="#quick-start" class="nav-item" data-nav="quick-start">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
        Quick
      </a>
      <a href="#custom-programs" class="nav-item" data-nav="custom-programs">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>
        Programs
      </a>
      <a href="#profile" class="nav-item" data-nav="profile">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        Profile
      </a>
    `;

    shell.appendChild(main);
    shell.appendChild(nav);

    if (splash && splash.parentNode === app) {
      app.insertBefore(shell, splash);
    } else {
      app.appendChild(shell);
    }

    nav.querySelectorAll('.nav-item').forEach((a) => {
      a.addEventListener('click', (e) => {
        const navId = a.dataset.nav;
        if (navId) navigate(navId);
      });
    });

    window.addEventListener('hashchange', handleHashChange);
  }

  // --- Screen Content ---
  const initScreens = {
    home() {
      const el = document.getElementById('screen-home');
      if (!el || el.innerHTML) return;
      el.innerHTML = `
        <div class="screen-header">
          <h1 class="screen-title">SwimEx EDGE</h1>
          <div class="header-actions">
            <button class="btn btn-ghost btn-icon" id="theme-toggle" title="Toggle theme">◐</button>
          </div>
        </div>
        <div class="card">
          <h2 class="card-title">Welcome</h2>
          <p class="text-muted mb-2">Pool control at your fingertips.</p>
          <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
            <a href="#quick-start" class="btn btn-primary">Quick Start</a>
            <a href="#custom-programs" class="btn btn-ghost">Programs</a>
            <a href="#login" class="btn btn-ghost">Login</a>
            <a href="#admin" class="btn btn-ghost">Admin</a>
          </div>
        </div>
      `;
      document.getElementById('theme-toggle')?.addEventListener('click', toggleTheme);
    },

    login() {
      const el = document.getElementById('screen-login');
      if (!el || el.innerHTML) return;
      el.innerHTML = `
        <div class="screen-header">
          <h1 class="screen-title">Login</h1>
          <a href="#home" class="btn btn-ghost">Back</a>
        </div>
        <div class="card">
          <form id="login-form">
            <div class="form-group">
              <label class="form-label">Username</label>
              <input type="text" class="form-input" name="username" required autocomplete="username">
            </div>
            <div class="form-group">
              <label class="form-label">Password</label>
              <input type="password" class="form-input" name="password" required autocomplete="current-password">
            </div>
            <button type="submit" class="btn btn-primary btn-lg" style="width:100%">Login</button>
          </form>
          <p class="text-muted mt-2 text-center"><a href="#register" style="color:var(--color-accent)">Create account</a></p>
        </div>
      `;
      document.getElementById('login-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        try {
          await API.login(fd.get('username'), fd.get('password'));
          navigate('home');
        } catch (err) {
          alert(err.message || 'Login failed');
        }
      });
    },

    register() {
      const el = document.getElementById('screen-register');
      if (!el || el.innerHTML) return;
      el.innerHTML = `
        <div class="screen-header">
          <h1 class="screen-title">Register</h1>
          <a href="#login" class="btn btn-ghost">Back</a>
        </div>
        <div class="card">
          <form id="register-form">
            <div class="form-group">
              <label class="form-label">Username</label>
              <input type="text" class="form-input" name="username" required>
            </div>
            <div class="form-group">
              <label class="form-label">Display Name</label>
              <input type="text" class="form-input" name="displayName" placeholder="Optional">
            </div>
            <div class="form-group">
              <label class="form-label">Password</label>
              <input type="password" class="form-input" name="password" required>
            </div>
            <div class="form-group">
              <label class="form-label">Email</label>
              <input type="email" class="form-input" name="email" placeholder="Optional">
            </div>
            <button type="submit" class="btn btn-primary btn-lg" style="width:100%">Register</button>
          </form>
        </div>
      `;
      document.getElementById('register-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        try {
          await API.register(
            fd.get('username'),
            fd.get('password'),
            fd.get('displayName') || undefined,
            fd.get('email') || undefined
          );
          navigate('home');
        } catch (err) {
          alert(err.message || 'Registration failed');
        }
      });
    },

    'quick-start'() {
      const el = document.getElementById('screen-quick-start');
      if (!el || el.innerHTML) return;
      el.innerHTML = `
        <div class="screen-header">
          <h1 class="screen-title">Quick Start</h1>
          <a href="#home" class="btn btn-ghost">Back</a>
        </div>
        <div class="card">
          <form id="quick-start-form" class="quick-start-form">
            <div class="form-group">
              <label class="form-label">Speed (%)</label>
              <input type="text" class="form-input" name="speed" value="50" readonly id="qs-speed" data-keypad>
            </div>
            <div class="form-group">
              <label class="form-label">Time (minutes)</label>
              <input type="text" class="form-input" name="time" value="10" readonly id="qs-time" data-keypad>
            </div>
            <button type="submit" class="btn btn-success btn-lg" style="width:100%">Start Workout</button>
          </form>
        </div>
      `;
      ['qs-speed', 'qs-time'].forEach((id) => {
        const inp = document.getElementById(id);
        if (inp) inp.addEventListener('click', () => {
          WorkoutUI.showKeypad({
            initialValue: inp.value,
            onConfirm: (v) => { inp.value = String(v); },
          });
        });
      });
      document.getElementById('quick-start-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const speed = parseFloat(document.getElementById('qs-speed')?.value) || 50;
        const time = parseFloat(document.getElementById('qs-time')?.value) || 10;
        try {
          await API.quickStart(speed, time * 60 * 1000);
          navigate('home');
        } catch (err) {
          alert(err.message || 'Failed to start');
        }
      });
    },

    'custom-programs'() {
      const el = document.getElementById('screen-custom-programs');
      if (!el || el.innerHTML) return;
      el.innerHTML = `
        <div class="screen-header">
          <h1 class="screen-title">Programs</h1>
          <a href="#home" class="btn btn-ghost">Back</a>
        </div>
        <div class="card">
          <div id="program-list" class="program-list">Loading...</div>
        </div>
      `;
      loadPrograms();
    },

    interval() {
      renderWorkoutScreen('screen-interval', 'Interval');
    },

    distance() {
      renderWorkoutScreen('screen-distance', 'Distance');
    },

    sprint() {
      renderWorkoutScreen('screen-sprint', 'Sprint');
    },

    profile() {
      const el = document.getElementById('screen-profile');
      if (!el || el.innerHTML) return;
      el.innerHTML = `
        <div class="screen-header">
          <h1 class="screen-title">Profile</h1>
          <a href="#home" class="btn btn-ghost">Back</a>
        </div>
        <div class="card text-center">
          <div class="profile-avatar" id="profile-avatar">?</div>
          <p id="profile-name" class="text-muted">Guest</p>
          <button class="btn btn-ghost mt-2" id="profile-logout">Logout</button>
        </div>
      `;
      loadProfile();
      document.getElementById('profile-logout')?.addEventListener('click', async () => {
        await API.logout();
        navigate('home');
      });
    },

    admin() {
      const el = document.getElementById('screen-admin');
      if (!el || el.innerHTML) return;
      el.innerHTML = `
        <div class="screen-header">
          <h1 class="screen-title">Admin</h1>
          <a href="#home" class="btn btn-ghost">Back</a>
        </div>
        <div class="admin-grid">
          <div class="admin-section">
            <h3>Users</h3>
            <div id="admin-users">—</div>
          </div>
          <div class="admin-section">
            <h3>Devices</h3>
            <div id="admin-devices">—</div>
          </div>
        </div>
      `;
      loadAdmin();
    },
  };

  function renderWorkoutScreen(id, title) {
    const el = document.getElementById(id);
    if (!el || el.innerHTML) return;
    el.innerHTML = `
      <div class="screen-header">
        <h1 class="screen-title">${title}</h1>
        <a href="#home" class="btn btn-ghost">Back</a>
      </div>
      <div class="card">
        <p class="text-muted">Select a program from Custom Programs to start.</p>
      </div>
    `;
  }

  async function loadPrograms() {
    const list = document.getElementById('program-list');
    if (!list) return;
    try {
      const programs = await API.getPrograms();
      list.innerHTML = programs.length
        ? programs.map((p) => `
            <div class="program-item" data-id="${p.id}">
              <span>${p.name}</span>
              <button class="btn btn-primary btn-sm" data-start="${p.id}">Start</button>
            </div>
          `).join('')
        : '<p class="text-muted">No programs yet.</p>';
      list.querySelectorAll('[data-start]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          try {
            await API.startProgram(btn.dataset.start);
            navigate('home');
          } catch (e) {
            alert(e.message || 'Failed');
          }
        });
      });
    } catch {
      list.innerHTML = '<p class="text-muted">Login required.</p>';
    }
  }

  async function loadProfile() {
    try {
      const { user } = await API.getProfile();
      const avatar = document.getElementById('profile-avatar');
      const name = document.getElementById('profile-name');
      if (avatar) avatar.textContent = (user?.displayName || user?.username || '?')[0].toUpperCase();
      if (name) name.textContent = user?.displayName || user?.username || 'Guest';
    } catch {
      document.getElementById('profile-name').textContent = 'Guest';
    }
  }

  async function loadAdmin() {
    try {
      const [users, devices] = await Promise.all([
        API.listUsers().catch(() => []),
        API.listDevices().catch(() => []),
      ]);
      document.getElementById('admin-users').textContent = Array.isArray(users) ? users.length : '—';
      document.getElementById('admin-devices').textContent = Array.isArray(devices) ? devices.length : '—';
    } catch {
      document.getElementById('admin-users').textContent = '—';
      document.getElementById('admin-devices').textContent = '—';
    }
  }

  // --- Workout execution display ---
  function showWorkoutOverlay(workout) {
    let overlay = document.getElementById('workout-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'workout-overlay';
      overlay.className = 'screen active';
      overlay.style.cssText = 'position:fixed;inset:0;background:var(--color-bg);z-index:1500;display:flex;flex-direction:column;padding:1rem;';
      document.body.appendChild(overlay);
    }

    const gaugeEl = overlay.querySelector('.workout-gauge-container') || document.createElement('div');
    gaugeEl.className = 'workout-gauge-container';
    WorkoutUI.createSpeedGauge(gaugeEl, workout?.currentSpeed ?? 0);

    const timerEl = overlay.querySelector('.workout-timer-container') || document.createElement('div');
    timerEl.className = 'workout-timer-container';
    const elapsed = workout?.totalElapsedMs ?? workout?.elapsedMs ?? 0;
    WorkoutUI.createTimerDisplay(timerEl, elapsed);

    const stepEl = overlay.querySelector('.workout-step-container') || document.createElement('div');
    stepEl.className = 'workout-step-container';
    const steps = workout?.steps || workout?.program?.steps || [];
    const cs = workout?.currentStepIndex ?? workout?.currentStep ?? 0;
    WorkoutUI.createStepProgress(stepEl, Math.max(1, steps.length), cs, cs);

    const ctrlEl = overlay.querySelector('.workout-controls-container') || document.createElement('div');
    ctrlEl.className = 'workout-controls-container';
    WorkoutUI.createControlButtons(ctrlEl, {
      onStart: () => WebSocketClient.sendCommand('START'),
      onPause: () => API.pause(),
      onResume: () => API.resume(),
      onEnd: () => API.stop().then(() => hideWorkoutOverlay()),
      onSpeedUp: () => API.adjustSpeed(5),
      onSpeedDown: () => API.adjustSpeed(-5),
    });

    overlay.innerHTML = '';
    overlay.appendChild(gaugeEl);
    overlay.appendChild(timerEl);
    overlay.appendChild(stepEl);
    overlay.appendChild(ctrlEl);

    WorkoutUI.setControlState(ctrlEl, workout?.state ?? 'IDLE');
    overlay.style.display = 'flex';
  }

  function hideWorkoutOverlay() {
    const overlay = document.getElementById('workout-overlay');
    if (overlay) overlay.style.display = 'none';
    if (workoutTickInterval) {
      clearInterval(workoutTickInterval);
      workoutTickInterval = null;
    }
  }

  function updateWorkoutDisplay(workout) {
    const overlay = document.getElementById('workout-overlay');
    if (!overlay || !workout) return;

    WorkoutUI.updateSpeedGauge(overlay.querySelector('.workout-gauge-container'), workout.currentSpeed ?? 0);
    WorkoutUI.updateTimerDisplay(overlay.querySelector('.workout-timer-container'), workout.totalElapsedMs ?? workout.elapsedMs ?? 0);
    const steps = workout.steps || workout.program?.steps || [];
    const currentStep = workout.currentStepIndex ?? workout.currentStep ?? 0;
    const completed = workout.currentStepIndex ?? 0;
    WorkoutUI.updateStepProgress(overlay.querySelector('.workout-step-container'), currentStep, completed);
    WorkoutUI.setControlState(overlay.querySelector('.workout-controls-container'), workout.state ?? 'IDLE');

    if (workout.state === 'SAFETY_STOP') {
      WorkoutUI.showSafetyStop('Pool stopped for safety.', () => {});
    }
  }

  // --- Theme ---
  function toggleTheme() {
    const root = document.documentElement;
    const current = root.getAttribute('data-theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    const next = current === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try {
      localStorage.setItem('swimex_theme', next);
    } catch (_) {}
  }

  function loadTheme() {
    try {
      const saved = localStorage.getItem('swimex_theme');
      if (saved) document.documentElement.setAttribute('data-theme', saved);
    } catch (_) {}
  }

  // --- Connection status ---
  function updateConnectionStatus(status) {
    const el = document.getElementById('connection-status');
    if (!el) return;
    el.className = 'connection-status ' + status;
    el.querySelector('span:last-child').textContent =
      status === 'connected' ? 'Connected' : status === 'reconnecting' ? 'Reconnecting...' : 'Disconnected';
  }

  // --- Init ---
  function init() {
    loadTheme();
    buildApp();
    handleHashChange();

    WebSocketClient.on('connected', () => {
      updateConnectionStatus('connected');
    });
    WebSocketClient.on('disconnected', () => {
      updateConnectionStatus(WebSocketClient.getReconnectAttempts() < 5 ? 'reconnecting' : 'disconnected');
    });

    WebSocketClient.on('workout', (payload) => {
      const w = payload?.workout ?? payload;
      if (w) {
        lastWorkoutState = w;
        if (w.state && w.state !== 'IDLE') {
          showWorkoutOverlay(w);
        } else {
          hideWorkoutOverlay();
        }
        updateWorkoutDisplay(w);
      }
      if (payload?.event === 'safety_stop') {
        WorkoutUI.showSafetyStop('Safety stop activated.', () => {});
      }
    });

    WebSocketClient.connect();

    // Poll active workout if WS sends connected with workout
    setTimeout(async () => {
      try {
        const w = await API.getActiveWorkout();
        if (w && w.state && w.state !== 'IDLE') {
          showWorkoutOverlay(w);
          lastWorkoutState = w;
          workoutTickInterval = setInterval(async () => {
            try {
              const fresh = await API.getActiveWorkout();
              if (fresh && fresh.state !== 'IDLE') {
                lastWorkoutState = fresh;
                updateWorkoutDisplay(fresh);
              } else {
                hideWorkoutOverlay();
              }
            } catch (_) {}
          }, 1000);
        }
      } catch (_) {}
    }, 500);

    setTimeout(hideSplash, 800);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.SwimExApp = { navigate, ROUTES };
})();
