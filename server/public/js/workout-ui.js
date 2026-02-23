/**
 * SwimEx EDGE — Workout Display Logic
 * Speed gauge, timer, step progress, control buttons, keypad, safety alert
 */

const WorkoutUI = (function () {
  'use strict';

  const GAUGE_MIN = 0;
  const GAUGE_MAX = 100;

  function createSpeedGauge(container, value = 0) {
    if (!container) return null;
    const pct = Math.max(0, Math.min(100, value));
    const angle = (pct / 100) * 270 - 135; // -135° to 135°
    const radius = 100;
    const cx = 120;
    const cy = 120;

    const html = `
      <svg class="speed-gauge" viewBox="0 0 240 140" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="gaugeBg" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style="stop-color:var(--color-primary-light)"/>
            <stop offset="100%" style="stop-color:var(--color-accent)"/>
          </linearGradient>
        </defs>
        <path d="M 20 120 A 100 100 0 0 1 220 120" fill="none" stroke="var(--color-surface)" stroke-width="12" stroke-linecap="round"/>
        <path class="gauge-fill" d="M 20 120 A 100 100 0 0 1 220 120" fill="none" stroke="url(#gaugeBg)" stroke-width="12" stroke-linecap="round"
          stroke-dasharray="471" stroke-dashoffset="${471 - (pct / 100) * 471}"/>
        <text x="120" y="95" text-anchor="middle" class="gauge-value">${Math.round(pct)}</text>
        <text x="120" y="115" text-anchor="middle" class="gauge-unit">%</text>
      </svg>
    `;
    container.innerHTML = html;
    return container;
  }

  function updateSpeedGauge(container, value) {
    const pct = Math.max(0, Math.min(100, value));
    const fill = container?.querySelector('.gauge-fill');
    const valEl = container?.querySelector('.gauge-value');
    if (fill) fill.setAttribute('stroke-dashoffset', 471 - (pct / 100) * 471);
    if (valEl) valEl.textContent = Math.round(pct);
  }

  function createTimerDisplay(container, elapsedMs = 0) {
    if (!container) return null;
    const s = Math.floor(elapsedMs / 1000) % 60;
    const m = Math.floor(elapsedMs / 60000);
    const str = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    container.innerHTML = `<span class="workout-timer">${str}</span>`;
    return container;
  }

  function updateTimerDisplay(container, elapsedMs) {
    const s = Math.floor(elapsedMs / 1000) % 60;
    const m = Math.floor(elapsedMs / 60000);
    const str = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    const el = container?.querySelector?.('.workout-timer') || container;
    if (el) el.textContent = str;
  }

  function createStepProgress(container, total, current, completed) {
    if (!container) return null;
    const dots = [];
    for (let i = 0; i < total; i++) {
      let cls = 'step-dot';
      if (i < completed) cls += ' completed';
      else if (i === current) cls += ' active';
      dots.push(`<span class="${cls}" data-step="${i}"></span>`);
    }
    container.innerHTML = `<div class="workout-step-progress">${dots.join('')}</div>`;
    return container;
  }

  function updateStepProgress(container, current, completed) {
    const dots = container?.querySelectorAll?.('.step-dot');
    if (!dots) return;
    dots.forEach((d, i) => {
      d.classList.remove('active', 'completed');
      if (i < completed) d.classList.add('completed');
      else if (i === current) d.classList.add('active');
    });
  }

  function createControlButtons(container, callbacks) {
    if (!container) return null;
    const { onStart, onPause, onResume, onEnd, onSpeedUp, onSpeedDown } = callbacks || {};
    container.innerHTML = `
      <div class="workout-controls">
        <button class="btn btn-success btn-lg" data-action="start">START</button>
        <button class="btn btn-primary btn-lg" data-action="pause">PAUSE</button>
        <button class="btn btn-primary btn-lg" data-action="resume" style="display:none">RESUME</button>
        <button class="btn btn-danger btn-lg" data-action="end">END</button>
        <button class="btn btn-ghost btn-icon" data-action="speed-up">+</button>
        <button class="btn btn-ghost btn-icon" data-action="speed-down">−</button>
      </div>
    `;

    container.querySelectorAll('[data-action]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const a = btn.dataset.action;
        if (a === 'start') onStart?.();
        else if (a === 'pause') onPause?.();
        else if (a === 'resume') onResume?.();
        else if (a === 'end') onEnd?.();
        else if (a === 'speed-up') onSpeedUp?.();
        else if (a === 'speed-down') onSpeedDown?.();
      });
    });

    return container;
  }

  function setControlState(container, state) {
    const start = container?.querySelector('[data-action="start"]');
    const pause = container?.querySelector('[data-action="pause"]');
    const resume = container?.querySelector('[data-action="resume"]');
    if (!start || !pause || !resume) return;
    if (state === 'RUNNING') {
      start.style.display = 'none';
      pause.style.display = '';
      resume.style.display = 'none';
    } else if (state === 'PAUSED') {
      start.style.display = 'none';
      pause.style.display = 'none';
      resume.style.display = '';
    } else {
      start.style.display = '';
      pause.style.display = '';
      resume.style.display = 'none';
    }
  }

  function createKeypadPopup(options) {
    const { title = 'Enter value', initialValue = '', unit = '', onConfirm, onCancel } = options || {};
    const overlay = document.createElement('div');
    overlay.className = 'keypad-overlay';

    let value = String(initialValue);

    const updateDisplay = () => {
      const el = overlay.querySelector('.keypad-display');
      if (el) el.textContent = value || '0';
    };

    overlay.innerHTML = `
      <div class="keypad-modal">
        <div class="keypad-display">${value || '0'}</div>
        <div class="keypad-grid">
          <button class="keypad-btn" data-key="7">7</button>
          <button class="keypad-btn" data-key="8">8</button>
          <button class="keypad-btn" data-key="9">9</button>
          <button class="keypad-btn" data-key="4">4</button>
          <button class="keypad-btn" data-key="5">5</button>
          <button class="keypad-btn" data-key="6">6</button>
          <button class="keypad-btn" data-key="1">1</button>
          <button class="keypad-btn" data-key="2">2</button>
          <button class="keypad-btn" data-key="3">3</button>
          <button class="keypad-btn" data-key="0">0</button>
          <button class="keypad-btn" data-key=".">.</button>
          <button class="keypad-btn" data-key="back">⌫</button>
          <button class="keypad-btn" data-key="clear" style="grid-column:span 2">CLEAR</button>
          <button class="keypad-btn" data-key="ok">OK</button>
        </div>
      </div>
    `;

    overlay.querySelectorAll('.keypad-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const k = btn.dataset.key;
        if (k === 'back') value = value.slice(0, -1);
        else if (k === 'clear') value = '';
        else if (k === 'ok') {
          overlay.remove();
          onConfirm?.(parseFloat(value) || 0);
        } else value += k;
        updateDisplay();
      });
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.remove();
        onCancel?.();
      }
    });

    document.body.appendChild(overlay);
    return overlay;
  }

  function showKeypad(options) {
    return createKeypadPopup(options);
  }

  function createSafetyStopOverlay(message, onAcknowledge) {
    const overlay = document.createElement('div');
    overlay.className = 'safety-alert-overlay';
    overlay.innerHTML = `
      <h2>SAFETY STOP</h2>
      <p>${message || 'Pool has been stopped for safety.'}</p>
      <button class="btn btn-success btn-lg" data-ack>ACKNOWLEDGE</button>
    `;
    overlay.querySelector('[data-ack]').addEventListener('click', () => {
      overlay.remove();
      onAcknowledge?.();
    });
    document.body.appendChild(overlay);
    return overlay;
  }

  function showSafetyStop(message, onAcknowledge) {
    return createSafetyStopOverlay(message, onAcknowledge);
  }

  return {
    createSpeedGauge,
    updateSpeedGauge,
    createTimerDisplay,
    updateTimerDisplay,
    createStepProgress,
    updateStepProgress,
    createControlButtons,
    setControlState,
    showKeypad,
    showSafetyStop,
    GAUGE_MIN,
    GAUGE_MAX,
  };
})();
