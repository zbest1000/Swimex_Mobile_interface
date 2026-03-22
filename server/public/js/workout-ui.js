/**
 * SwimEx EDGE — Workout Display Components
 * SVG gauge, timer, step progress, control buttons, numeric keypad, safety stop.
 */
const WorkoutUI = (function () {
  'use strict';

  function formatTime(ms) {
    if (ms == null || ms < 0) ms = 0;
    var totalSec = Math.floor(ms / 1000);
    var m = Math.floor(totalSec / 60);
    var s = totalSec % 60;
    return pad2(m) + ':' + pad2(s);
  }

  function formatTimeDetailed(ms) {
    if (ms == null || ms < 0) ms = 0;
    var totalSec = Math.floor(ms / 1000);
    var h = Math.floor(totalSec / 3600);
    var m = Math.floor((totalSec % 3600) / 60);
    var s = totalSec % 60;
    return pad2(h) + ':' + pad2(m) + ':' + pad2(s);
  }

  function pad2(n) { return n < 10 ? '0' + n : '' + n; }

  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

  function renderSpeedGauge(container, speed, maxSpeed) {
    if (!container) return;
    maxSpeed = maxSpeed || 100;
    speed = clamp(speed || 0, 0, maxSpeed);
    var pct = speed / maxSpeed;

    var cx = 150, cy = 130, r = 100;
    var startAngle = 225, endAngle = -45;
    var totalArc = 270;
    var sweepAngle = pct * totalArc;

    function polarToXY(angleDeg) {
      var rad = (angleDeg * Math.PI) / 180;
      return { x: cx + r * Math.cos(rad), y: cy - r * Math.sin(rad) };
    }

    function polarToXYR(angleDeg, radius) {
      var rad = (angleDeg * Math.PI) / 180;
      return { x: cx + radius * Math.cos(rad), y: cy - radius * Math.sin(rad) };
    }

    var bgStart = polarToXY(startAngle);
    var bgEnd = polarToXY(endAngle);
    var valEnd = polarToXY(startAngle - sweepAngle);
    var largeArc = totalArc > 180 ? 1 : 0;
    var valLargeArc = sweepAngle > 180 ? 1 : 0;

    var ticks = '';
    for (var i = 0; i <= 10; i++) {
      var tickPct = i / 10;
      var tickAngle = startAngle - tickPct * totalArc;
      var outer = polarToXYR(tickAngle, r + 4);
      var inner = polarToXYR(tickAngle, r - (i % 5 === 0 ? 12 : 6));
      ticks += '<line x1="' + outer.x + '" y1="' + outer.y +
        '" x2="' + inner.x + '" y2="' + inner.y +
        '" stroke="var(--color-text-muted)" stroke-width="' + (i % 5 === 0 ? 2 : 1) +
        '" stroke-linecap="round"/>';
      if (i % 5 === 0) {
        var labelPos = polarToXYR(tickAngle, r - 22);
        ticks += '<text x="' + labelPos.x + '" y="' + labelPos.y +
          '" text-anchor="middle" dominant-baseline="central" class="gauge-label">' +
          Math.round(tickPct * maxSpeed) + '</text>';
      }
    }

    var needleAngle = startAngle - sweepAngle;
    var needleTip = polarToXYR(needleAngle, r - 14);
    var needleBase1 = polarToXYR(needleAngle + 90, 6);
    var needleBase2 = polarToXYR(needleAngle - 90, 6);

    var color;
    if (pct < 0.33) color = 'var(--color-success)';
    else if (pct < 0.66) color = 'var(--color-accent)';
    else if (pct < 0.85) color = 'var(--color-warning)';
    else color = 'var(--color-danger)';

    var textY = cy + r + 30;

    container.innerHTML =
      '<svg class="speed-gauge" viewBox="0 0 300 ' + (textY + 30) + '" xmlns="http://www.w3.org/2000/svg">' +
        '<defs>' +
          '<linearGradient id="gaugeArc" x1="0%" y1="0%" x2="100%" y2="0%">' +
            '<stop offset="0%" style="stop-color:var(--color-success)"/>' +
            '<stop offset="50%" style="stop-color:var(--color-accent)"/>' +
            '<stop offset="100%" style="stop-color:var(--color-danger)"/>' +
          '</linearGradient>' +
        '</defs>' +
        '<path d="M ' + bgStart.x + ' ' + bgStart.y + ' A ' + r + ' ' + r + ' 0 ' + largeArc + ' 0 ' + bgEnd.x + ' ' + bgEnd.y + '"' +
          ' fill="none" stroke="var(--color-surface)" stroke-width="12" stroke-linecap="round"/>' +
        '<path d="M ' + bgStart.x + ' ' + bgStart.y + ' A ' + r + ' ' + r + ' 0 ' + valLargeArc + ' 0 ' + valEnd.x + ' ' + valEnd.y + '"' +
          ' fill="none" stroke="url(#gaugeArc)" stroke-width="12" stroke-linecap="round" class="gauge-fill"/>' +
        ticks +
        '<polygon points="' + needleTip.x + ',' + needleTip.y + ' ' + needleBase1.x + ',' + needleBase1.y + ' ' + needleBase2.x + ',' + needleBase2.y + '"' +
          ' fill="' + color + '" class="gauge-needle"/>' +
        '<circle cx="' + cx + '" cy="' + cy + '" r="7" fill="var(--color-bg-elevated)"/>' +
        '<circle cx="' + cx + '" cy="' + cy + '" r="3" fill="' + color + '"/>' +
        '<text x="' + cx + '" y="' + textY + '" text-anchor="middle" class="gauge-value">' + Math.round(speed) + '</text>' +
        '<text x="' + cx + '" y="' + (textY + 22) + '" text-anchor="middle" class="gauge-unit">% speed</text>' +
      '</svg>';
  }

  function updateGaugeValue(container, speed, maxSpeed) {
    if (!container) return;
    maxSpeed = maxSpeed || 100;
    speed = clamp(speed || 0, 0, maxSpeed);
    var valEl = container.querySelector('.gauge-value');
    if (valEl) valEl.textContent = Math.round(speed);
    renderSpeedGauge(container, speed, maxSpeed);
  }

  function renderTimer(container, elapsedMs, totalMs) {
    if (!container) return;
    var elapsed = formatTime(elapsedMs || 0);
    var html = '<div class="execution-timer">' + elapsed + '</div>';
    if (totalMs && totalMs > 0) {
      html += '<div class="execution-timer-total">/ ' + formatTime(totalMs) + '</div>';
    }
    container.innerHTML = html;
  }

  function updateTimer(container, elapsedMs, totalMs) {
    if (!container) return;
    var timerEl = container.querySelector('.execution-timer');
    if (timerEl) timerEl.textContent = formatTime(elapsedMs || 0);
    var totalEl = container.querySelector('.execution-timer-total');
    if (totalEl && totalMs && totalMs > 0) {
      totalEl.textContent = '/ ' + formatTime(totalMs);
    }
  }

  function renderStepProgress(container, currentStep, totalSteps, currentSet, totalSets) {
    if (!container) return;
    totalSteps = totalSteps || 1;
    currentStep = currentStep || 0;
    var bars = '';
    for (var i = 0; i < totalSteps; i++) {
      var cls = 'step-indicator';
      if (i < currentStep) cls += ' completed';
      else if (i === currentStep) cls += ' active';
      bars += '<div class="' + cls + '" data-step="' + i + '"></div>';
    }
    var setLabel = '';
    if (totalSets && totalSets > 0) {
      setLabel = '<div class="step-set-label">Set ' + ((currentSet || 0) + 1) + ' of ' + totalSets + '</div>';
    }
    container.innerHTML =
      '<div class="step-progress-bar">' + bars + '</div>' + setLabel;
  }

  function updateStepProgress(container, currentStep, totalSteps, currentSet, totalSets) {
    renderStepProgress(container, currentStep, totalSteps, currentSet, totalSets);
  }

  function renderControlButtons(container, state, callbacks) {
    if (!container) return;
    callbacks = callbacks || {};
    var s = state || 'idle';

    var startVis = (s === 'idle' || s === 'stopped' || s === 'completed') ? '' : 'display:none;';
    var pauseVis = (s === 'running') ? '' : 'display:none;';
    var resumeVis = (s === 'paused') ? '' : 'display:none;';
    var stopVis = (s === 'running' || s === 'paused') ? '' : 'display:none;';
    var adjustVis = (s === 'running' || s === 'paused') ? '' : 'display:none;';

    container.innerHTML =
      '<div class="execution-controls">' +
        '<button class="btn btn-lg ctrl-btn-adjust" data-action="speed-down" style="' + adjustVis + '">&#x2212; 5</button>' +
        '<button class="btn btn-lg ctrl-btn-start" data-action="start" style="' + startVis + '">START</button>' +
        '<button class="btn btn-lg ctrl-btn-pause" data-action="pause" style="' + pauseVis + '">PAUSE</button>' +
        '<button class="btn btn-lg ctrl-btn-start" data-action="resume" style="' + resumeVis + '">RESUME</button>' +
        '<button class="btn btn-lg ctrl-btn-stop" data-action="stop" style="' + stopVis + '">STOP</button>' +
        '<button class="btn btn-lg ctrl-btn-adjust" data-action="speed-up" style="' + adjustVis + '">+ 5</button>' +
      '</div>';

    container.querySelectorAll('[data-action]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var a = btn.getAttribute('data-action');
        if (a === 'start' && callbacks.onStart) callbacks.onStart();
        else if (a === 'pause' && callbacks.onPause) callbacks.onPause();
        else if (a === 'resume' && callbacks.onResume) callbacks.onResume();
        else if (a === 'stop' && callbacks.onStop) callbacks.onStop();
        else if (a === 'speed-up' && callbacks.onSpeedUp) callbacks.onSpeedUp();
        else if (a === 'speed-down' && callbacks.onSpeedDown) callbacks.onSpeedDown();
      });
    });
  }

  function updateControlState(container, state) {
    if (!container) return;
    var s = (state || 'idle').toLowerCase();
    function vis(el, show) { if (el) el.style.display = show ? '' : 'none'; }
    vis(container.querySelector('[data-action="start"]'), s === 'idle' || s === 'stopped' || s === 'completed');
    vis(container.querySelector('[data-action="pause"]'), s === 'running');
    vis(container.querySelector('[data-action="resume"]'), s === 'paused');
    vis(container.querySelector('[data-action="stop"]'), s === 'running' || s === 'paused');
    vis(container.querySelector('[data-action="speed-up"]'), s === 'running' || s === 'paused');
    vis(container.querySelector('[data-action="speed-down"]'), s === 'running' || s === 'paused');
  }

  function renderNumericKeypad(onConfirm, options) {
    options = options || {};
    var title = options.title || 'Enter Value';
    var initial = options.initial !== undefined ? String(options.initial) : '';
    var maxLen = options.maxLen || 6;
    var allowDot = options.allowDot !== false;
    var mode = options.mode || 'number';

    var value = initial;

    var overlay = document.createElement('div');
    overlay.className = 'keypad-overlay';

    function display() {
      if (mode === 'time' && value.length > 0) {
        var digits = value.replace(/\D/g, '');
        var padded = digits.padStart(4, '0');
        return padded.slice(0, 2) + ':' + padded.slice(2, 4);
      }
      return value || '0';
    }

    var dotBtn = allowDot
      ? '<button class="keypad-btn" data-key=".">.</button>'
      : '<button class="keypad-btn" data-key="00">00</button>';

    overlay.innerHTML =
      '<div class="keypad-modal">' +
        '<div class="keypad-title">' + title + '</div>' +
        '<div class="keypad-display">' + display() + '</div>' +
        '<div class="keypad-grid">' +
          '<button class="keypad-btn" data-key="7">7</button>' +
          '<button class="keypad-btn" data-key="8">8</button>' +
          '<button class="keypad-btn" data-key="9">9</button>' +
          '<button class="keypad-btn" data-key="4">4</button>' +
          '<button class="keypad-btn" data-key="5">5</button>' +
          '<button class="keypad-btn" data-key="6">6</button>' +
          '<button class="keypad-btn" data-key="1">1</button>' +
          '<button class="keypad-btn" data-key="2">2</button>' +
          '<button class="keypad-btn" data-key="3">3</button>' +
          dotBtn +
          '<button class="keypad-btn" data-key="0">0</button>' +
          '<button class="keypad-btn keypad-btn-back" data-key="back">&#x232B;</button>' +
          '<button class="keypad-btn keypad-btn-clear" data-key="clear" style="grid-column:span 2">CLEAR</button>' +
          '<button class="keypad-btn keypad-btn-confirm" data-key="ok">OK</button>' +
        '</div>' +
      '</div>';

    var dispEl = overlay.querySelector('.keypad-display');

    function update() {
      if (dispEl) dispEl.textContent = display();
    }

    overlay.querySelectorAll('.keypad-btn').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var k = btn.getAttribute('data-key');
        if (k === 'back') {
          value = value.slice(0, -1);
        } else if (k === 'clear') {
          value = '';
        } else if (k === 'ok') {
          overlay.remove();
          var result;
          if (mode === 'time') {
            var d = value.replace(/\D/g, '').padStart(4, '0');
            result = parseInt(d.slice(0, 2)) * 60 + parseInt(d.slice(2, 4));
          } else {
            result = parseFloat(value) || 0;
          }
          if (onConfirm) onConfirm(result);
          return;
        } else if (k === '.' && value.includes('.')) {
          return;
        } else {
          if (value.length < maxLen) value += k;
        }
        update();
      });
    });

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) {
        overlay.remove();
        if (options.onCancel) options.onCancel();
      }
    });

    document.body.appendChild(overlay);
    return overlay;
  }

  function renderSafetyStopOverlay(show, message) {
    var existing = document.getElementById('safety-stop-overlay');
    if (!show) {
      if (existing) existing.remove();
      return null;
    }
    if (existing) return existing;

    var overlay = document.createElement('div');
    overlay.id = 'safety-stop-overlay';
    overlay.className = 'safety-overlay';
    overlay.innerHTML =
      '<div class="safety-icon">&#x26A0;</div>' +
      '<div class="safety-title">SAFETY STOP</div>' +
      '<div class="safety-message">' + (message || 'Connection Lost — Pool has been stopped for safety.') + '</div>' +
      '<button class="btn btn-lg" style="background:#fff;color:#E74C3C;font-weight:700;" id="safety-ack-btn">ACKNOWLEDGE</button>';

    overlay.querySelector('#safety-ack-btn').addEventListener('click', function () {
      overlay.remove();
    });

    document.body.appendChild(overlay);
    return overlay;
  }

  function updateExecution(container, workoutData) {
    if (!container || !workoutData) return;

    var gaugeEl = container.querySelector('.gauge-container');
    if (gaugeEl) {
      renderSpeedGauge(gaugeEl, workoutData.currentSpeed || 0, workoutData.maxSpeed || 100);
    }

    var timerEl = container.querySelector('.timer-container');
    if (timerEl) {
      updateTimer(timerEl, workoutData.totalElapsedMs || workoutData.elapsedMs || 0, workoutData.totalDurationMs);
    }

    var stepEl = container.querySelector('.step-container');
    if (stepEl) {
      var steps = workoutData.steps || (workoutData.program && workoutData.program.steps) || [];
      updateStepProgress(
        stepEl,
        workoutData.currentStepIndex || workoutData.currentStep || 0,
        steps.length || 1,
        workoutData.currentSet || 0,
        workoutData.totalSets || 0
      );
    }

    var ctrlEl = container.querySelector('.ctrl-container');
    if (ctrlEl) {
      updateControlState(ctrlEl, workoutData.state || 'idle');
    }

    if (workoutData.state === 'SAFETY_STOP' || workoutData.state === 'safety_stop') {
      renderSafetyStopOverlay(true, 'Safety stop activated.');
    }
  }

  return {
    renderSpeedGauge: renderSpeedGauge,
    renderTimer: renderTimer,
    updateTimer: updateTimer,
    renderStepProgress: renderStepProgress,
    updateStepProgress: updateStepProgress,
    renderControlButtons: renderControlButtons,
    updateControlState: updateControlState,
    renderNumericKeypad: renderNumericKeypad,
    renderSafetyStopOverlay: renderSafetyStopOverlay,
    updateExecution: updateExecution,
    formatTime: formatTime,
    formatTimeDetailed: formatTimeDetailed
  };
})();
