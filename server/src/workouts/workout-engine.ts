import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../database/connection';
import { tagDatabase } from '../tags/tag-database';
import { mqttBroker } from '../mqtt/mqtt-broker';
import { createLogger } from '../utils/logger';
import { WorkoutState, WorkoutType, TerminationType, FitnessLevel } from '../shared/models';
import type { WorkoutStep, SpeedSample } from '../shared/models';
import { config } from '../utils/config';

const log = createLogger('workout-engine');

export interface ActiveWorkout {
  sessionId: string;
  userId: string | null;
  programId: string | null;
  programName: string;
  type: WorkoutType | 'QUICK_START';
  state: WorkoutState;
  sets: number;
  currentSet: number;
  steps: WorkoutStep[];
  currentStepIndex: number;
  targetSpeed: number;
  currentSpeed: number;
  stepElapsedMs: number;
  stepDurationMs: number;
  totalElapsedMs: number;
  totalProgramDurationMs: number;
  speedLog: SpeedSample[];
  startedAt: number;
  pausedAt: number | null;
  totalPausedMs: number;
  deviceMAC: string;
  stepsCompleted: number;
}

/**
 * Full workout state machine with complete step/set progression,
 * accurate timekeeping (accounting for pauses), and session recording.
 */
export class WorkoutEngine extends EventEmitter {
  private active: ActiveWorkout | null = null;
  private tickTimer: NodeJS.Timeout | null = null;
  private speedSampleTimer: NodeJS.Timeout | null = null;
  private readonly TICK_INTERVAL_MS = 100;
  private readonly SPEED_SAMPLE_INTERVAL_MS = 2000;

  getActiveWorkout(): ActiveWorkout | null {
    return this.active ? { ...this.active, speedLog: [] } : null;
  }

  getFullActiveWorkout(): ActiveWorkout | null {
    return this.active ? { ...this.active } : null;
  }

  getState(): WorkoutState {
    return this.active?.state ?? WorkoutState.IDLE;
  }

  // --- Quick Start ---
  startQuickStart(speed: number, durationMs: number | null, userId: string | null, deviceMAC: string): ActiveWorkout {
    this.validateNotRunning();
    this.validateSpeed(speed);

    const steps: WorkoutStep[] = [{
      order: 1,
      minutes: durationMs != null ? Math.floor(durationMs / 60000) : 0,
      seconds: durationMs != null ? Math.floor((durationMs % 60000) / 1000) : 0,
      speed,
    }];

    const stepDuration = durationMs ?? 0;
    return this.initWorkout({
      userId,
      programId: null,
      programName: 'Quick Start',
      type: 'QUICK_START' as any,
      sets: 1,
      steps,
      stepDurationMs: stepDuration,
      totalProgramDurationMs: stepDuration,
      targetSpeed: speed,
      deviceMAC,
    });
  }

  // --- Start Program ---
  startProgram(programId: string, userId: string | null, deviceMAC: string): ActiveWorkout {
    this.validateNotRunning();

    const db = getDb();
    const program = db.prepare('SELECT * FROM workout_programs WHERE id = ?').get(programId) as Record<string, unknown> | undefined;
    if (!program) throw new Error('Workout program not found');

    const steps = JSON.parse(program.steps as string) as WorkoutStep[];
    if (steps.length === 0) throw new Error('Program has no steps');

    const totalMs = this.computeTotalProgramDuration(steps, program.sets as number);
    const firstStepMs = this.stepToMs(steps[0]);

    return this.initWorkout({
      userId,
      programId,
      programName: program.name as string,
      type: program.type as WorkoutType,
      sets: program.sets as number,
      steps,
      stepDurationMs: firstStepMs,
      totalProgramDurationMs: totalMs,
      targetSpeed: steps[0].speed,
      deviceMAC,
    });
  }

  // --- Start Preset ---
  startPreset(type: WorkoutType, level: FitnessLevel, userId: string | null, deviceMAC: string): ActiveWorkout {
    this.validateNotRunning();

    const presets = getPresetWorkouts();
    const typeKey = type === WorkoutType.DISTANCE_PRESET ? 'DISTANCE_PRESET' : 'SPRINT_PRESET';
    const presetSteps = presets[typeKey]?.[level];
    if (!presetSteps) throw new Error(`Preset not found: ${type}/${level}`);

    const sets = type === WorkoutType.SPRINT_PRESET ? 3 : 1;
    const totalMs = this.computeTotalProgramDuration(presetSteps, sets);
    const firstStepMs = this.stepToMs(presetSteps[0]);

    return this.initWorkout({
      userId,
      programId: null,
      programName: `${typeKey.replace('_', ' ')} — ${level}`,
      type,
      sets,
      steps: presetSteps,
      stepDurationMs: firstStepMs,
      totalProgramDurationMs: totalMs,
      targetSpeed: presetSteps[0].speed,
      deviceMAC,
    });
  }

  // --- Interval ---
  startInterval(sets: number, step1: WorkoutStep, step2: WorkoutStep, userId: string | null, deviceMAC: string): ActiveWorkout {
    this.validateNotRunning();
    if (sets < 1) throw new Error('Sets must be >= 1');

    const steps = [
      { ...step1, order: 1 },
      { ...step2, order: 2 },
    ];

    const totalMs = this.computeTotalProgramDuration(steps, sets);
    const firstStepMs = this.stepToMs(steps[0]);

    return this.initWorkout({
      userId,
      programId: null,
      programName: `Interval ${sets}x`,
      type: WorkoutType.INTERVAL,
      sets,
      steps,
      stepDurationMs: firstStepMs,
      totalProgramDurationMs: totalMs,
      targetSpeed: steps[0].speed,
      deviceMAC,
    });
  }

  private initWorkout(params: {
    userId: string | null;
    programId: string | null;
    programName: string;
    type: WorkoutType | 'QUICK_START';
    sets: number;
    steps: WorkoutStep[];
    stepDurationMs: number;
    totalProgramDurationMs: number;
    targetSpeed: number;
    deviceMAC: string;
  }): ActiveWorkout {
    this.active = {
      sessionId: uuidv4(),
      userId: params.userId,
      programId: params.programId,
      programName: params.programName,
      type: params.type,
      state: WorkoutState.RUNNING,
      sets: params.sets,
      currentSet: 1,
      steps: params.steps,
      currentStepIndex: 0,
      targetSpeed: params.targetSpeed,
      currentSpeed: params.targetSpeed,
      stepElapsedMs: 0,
      stepDurationMs: params.stepDurationMs,
      totalElapsedMs: 0,
      totalProgramDurationMs: params.totalProgramDurationMs,
      speedLog: [],
      startedAt: Date.now(),
      pausedAt: null,
      totalPausedMs: 0,
      deviceMAC: params.deviceMAC,
      stepsCompleted: 0,
    };

    this.startTicking();
    this.commandPlc('start', params.targetSpeed);

    log.info(`Workout started: "${params.programName}" (${params.type}), ${params.steps.length} steps × ${params.sets} sets`);
    this.emit('workout:started', this.getActiveWorkout());
    this.broadcastState();
    return this.getActiveWorkout()!;
  }

  // --- Controls ---

  pause(): ActiveWorkout | null {
    if (!this.active || this.active.state !== WorkoutState.RUNNING) return null;

    this.active.state = WorkoutState.PAUSED;
    this.active.pausedAt = Date.now();
    this.stopTicking();
    this.commandPlc('pause', 0);

    log.info('Workout paused');
    this.emit('workout:paused', this.getActiveWorkout());
    this.broadcastState();
    return this.getActiveWorkout();
  }

  resume(): ActiveWorkout | null {
    if (!this.active || this.active.state !== WorkoutState.PAUSED) return null;

    if (this.active.pausedAt) {
      this.active.totalPausedMs += Date.now() - this.active.pausedAt;
      this.active.pausedAt = null;
    }

    this.active.state = WorkoutState.RUNNING;
    this.startTicking();
    this.commandPlc('resume', this.active.targetSpeed);

    log.info('Workout resumed');
    this.emit('workout:resumed', this.getActiveWorkout());
    this.broadcastState();
    return this.getActiveWorkout();
  }

  stop(terminatedBy: TerminationType = TerminationType.TABLET_END): void {
    if (!this.active) return;

    const prev = this.active.state;
    this.active.state = WorkoutState.IDLE;
    this.stopTicking();
    this.commandPlc('stop', 0);

    this.saveSession(terminatedBy);
    const finished = this.getActiveWorkout();
    this.active = null;

    log.info(`Workout stopped: ${terminatedBy} (was ${prev})`);
    this.emit('workout:stopped', finished, terminatedBy);
    this.broadcastState();
  }

  safetyStop(): void {
    if (!this.active) return;
    if (this.active.state === WorkoutState.SAFETY_STOP) return;

    this.active.state = WorkoutState.SAFETY_STOP;
    this.stopTicking();

    log.warn('SAFETY STOP — heartbeat lost');
    this.emit('workout:safety_stop', this.getActiveWorkout());
    this.broadcastState();
  }

  recoverFromSafetyStop(): void {
    if (!this.active || this.active.state !== WorkoutState.SAFETY_STOP) return;
    this.active.state = WorkoutState.IDLE;
    this.stopTicking();
    this.commandPlc('stop', 0);
    this.saveSession(TerminationType.SAFETY_STOP);
    const finished = this.getActiveWorkout();
    this.active = null;

    log.info('Recovered from safety stop — returned to IDLE');
    this.emit('workout:stopped', finished, TerminationType.SAFETY_STOP);
    this.broadcastState();
  }

  adjustSpeed(delta: number): void {
    if (!this.active || this.active.state !== WorkoutState.RUNNING) return;
    const newSpeed = Math.max(0, Math.min(100, this.active.targetSpeed + delta));
    this.active.targetSpeed = newSpeed;
    this.active.currentSpeed = newSpeed;
    this.commandPlc('set_speed', newSpeed);
    this.emit('workout:speed_changed', newSpeed);
    this.broadcastState();
  }

  setSpeed(speed: number): void {
    if (!this.active || this.active.state !== WorkoutState.RUNNING) return;
    const clamped = Math.max(0, Math.min(100, speed));
    this.active.targetSpeed = clamped;
    this.active.currentSpeed = clamped;
    this.commandPlc('set_speed', clamped);
    this.emit('workout:speed_changed', clamped);
    this.broadcastState();
  }

  // --- Tick Loop ---

  private startTicking(): void {
    this.stopTicking();
    this.tickTimer = setInterval(() => this.tick(), this.TICK_INTERVAL_MS);
    this.speedSampleTimer = setInterval(() => this.sampleSpeed(), this.SPEED_SAMPLE_INTERVAL_MS);
  }

  private stopTicking(): void {
    if (this.tickTimer) { clearInterval(this.tickTimer); this.tickTimer = null; }
    if (this.speedSampleTimer) { clearInterval(this.speedSampleTimer); this.speedSampleTimer = null; }
  }

  private tick(): void {
    if (!this.active || this.active.state !== WorkoutState.RUNNING) return;

    this.active.stepElapsedMs += this.TICK_INTERVAL_MS;
    this.active.totalElapsedMs += this.TICK_INTERVAL_MS;

    // Read actual speed from PLC tag if available
    const plcSpeed = tagDatabase.readTagValue(`swimex/${config.poolId}/status/current_speed`);
    if (typeof plcSpeed === 'number') {
      this.active.currentSpeed = plcSpeed;
    }

    // Check step completion (0 duration = indefinite for Quick Start)
    if (this.active.stepDurationMs > 0 && this.active.stepElapsedMs >= this.active.stepDurationMs) {
      this.advanceStep();
    }

    // Throttled UI update — every 500ms
    if (this.active.totalElapsedMs % 500 < this.TICK_INTERVAL_MS) {
      this.emit('workout:tick', this.getActiveWorkout());
    }
  }

  private advanceStep(): void {
    if (!this.active) return;

    this.active.stepsCompleted++;
    const nextStepIndex = this.active.currentStepIndex + 1;

    if (nextStepIndex >= this.active.steps.length) {
      // End of set
      if (this.active.currentSet < this.active.sets) {
        this.active.currentSet++;
        this.active.currentStepIndex = 0;
        this.active.stepElapsedMs = 0;
        const step = this.active.steps[0];
        this.active.targetSpeed = step.speed;
        this.active.currentSpeed = step.speed;
        this.active.stepDurationMs = this.stepToMs(step);
        this.commandPlc('set_speed', step.speed);
        log.info(`Set ${this.active.currentSet}/${this.active.sets} started`);
        this.emit('workout:set_changed', { set: this.active.currentSet, totalSets: this.active.sets });
      } else {
        // All sets complete
        log.info('Workout program complete');
        this.stop(TerminationType.TIMER_COMPLETE);
        return;
      }
    } else {
      this.active.currentStepIndex = nextStepIndex;
      this.active.stepElapsedMs = 0;
      const step = this.active.steps[nextStepIndex];
      this.active.targetSpeed = step.speed;
      this.active.currentSpeed = step.speed;
      this.active.stepDurationMs = this.stepToMs(step);
      this.commandPlc('set_speed', step.speed);
      log.info(`Step ${nextStepIndex + 1}/${this.active.steps.length}: speed=${step.speed}%, duration=${this.active.stepDurationMs}ms`);
      this.emit('workout:step_changed', { step: nextStepIndex, totalSteps: this.active.steps.length, speed: step.speed });
    }

    this.broadcastState();
  }

  private sampleSpeed(): void {
    if (!this.active || this.active.state !== WorkoutState.RUNNING) return;
    this.active.speedLog.push({
      timestamp: new Date().toISOString(),
      speed: this.active.currentSpeed,
    });
  }

  // --- PLC Command Dispatch ---

  private commandPlc(command: string, speed: number): void {
    const prefix = `swimex/${config.poolId}`;

    tagDatabase.writeTag(`${prefix}/command/${command}`, { speed, timestamp: Date.now() }, 'workout-engine');
    tagDatabase.writeTag(`${prefix}/status/target_speed`, speed, 'workout-engine');
    tagDatabase.writeTag(`${prefix}/status/state`, this.active?.state ?? 'IDLE', 'workout-engine');

    mqttBroker.publishCommand(command, { speed, timestamp: Date.now() });
    mqttBroker.publishStatus('target_speed', speed);
    mqttBroker.publishStatus('state', this.active?.state ?? 'IDLE');
  }

  private broadcastState(): void {
    const prefix = `swimex/${config.poolId}`;
    const workout = this.getActiveWorkout();
    mqttBroker.publishStatus('workout', workout ?? { state: 'IDLE' });
    tagDatabase.writeTag(`${prefix}/status/workout`, workout ?? { state: 'IDLE' }, 'workout-engine');
  }

  // --- Session Persistence ---

  private saveSession(terminatedBy: TerminationType): void {
    if (!this.active) return;

    try {
      const db = getDb();
      db.prepare(`
        INSERT INTO workout_sessions (id, user_id, program_id, device_mac, started_at, ended_at, terminated_by, steps_completed, total_duration, speed_log)
        VALUES (?, ?, ?, ?, ?, datetime('now'), ?, ?, ?, ?)
      `).run(
        this.active.sessionId,
        this.active.userId,
        this.active.programId,
        this.active.deviceMAC,
        new Date(this.active.startedAt).toISOString(),
        terminatedBy,
        this.active.stepsCompleted,
        Math.round(this.active.totalElapsedMs / 1000),
        JSON.stringify(this.active.speedLog),
      );
      log.info(`Session saved: ${this.active.sessionId} (${terminatedBy}, ${Math.round(this.active.totalElapsedMs / 1000)}s)`);
    } catch (err: any) {
      log.error('Failed to save workout session', err.message);
    }
  }

  // --- Helpers ---

  private validateNotRunning(): void {
    if (this.active && this.active.state === WorkoutState.RUNNING) {
      this.stop(TerminationType.TABLET_END);
    }
  }

  private validateSpeed(speed: number): void {
    if (speed < 0 || speed > 100) throw new Error('Speed must be between 0 and 100');
  }

  private stepToMs(step: WorkoutStep): number {
    return (step.minutes * 60 + step.seconds) * 1000;
  }

  private computeTotalProgramDuration(steps: WorkoutStep[], sets: number): number {
    const setDuration = steps.reduce((sum, s) => sum + this.stepToMs(s), 0);
    return setDuration * sets;
  }
}

export const workoutEngine = new WorkoutEngine();

// --- Preset Workouts ---

export function getPresetWorkouts(): Record<string, Record<string, WorkoutStep[]>> {
  return {
    DISTANCE_PRESET: {
      BEGINNER: [
        { order: 1, minutes: 3, seconds: 0, speed: 15 },
        { order: 2, minutes: 5, seconds: 0, speed: 25 },
        { order: 3, minutes: 10, seconds: 0, speed: 30 },
        { order: 4, minutes: 5, seconds: 0, speed: 25 },
        { order: 5, minutes: 2, seconds: 0, speed: 15 },
      ],
      INTERMEDIATE: [
        { order: 1, minutes: 3, seconds: 0, speed: 25 },
        { order: 2, minutes: 5, seconds: 0, speed: 40 },
        { order: 3, minutes: 15, seconds: 0, speed: 50 },
        { order: 4, minutes: 5, seconds: 0, speed: 40 },
        { order: 5, minutes: 2, seconds: 0, speed: 20 },
      ],
      ADVANCED: [
        { order: 1, minutes: 3, seconds: 0, speed: 35 },
        { order: 2, minutes: 5, seconds: 0, speed: 55 },
        { order: 3, minutes: 20, seconds: 0, speed: 70 },
        { order: 4, minutes: 5, seconds: 0, speed: 55 },
        { order: 5, minutes: 2, seconds: 0, speed: 30 },
      ],
    },
    SPRINT_PRESET: {
      BEGINNER: [
        { order: 1, minutes: 0, seconds: 30, speed: 45 },
        { order: 2, minutes: 1, seconds: 30, speed: 20 },
      ],
      INTERMEDIATE: [
        { order: 1, minutes: 0, seconds: 30, speed: 65 },
        { order: 2, minutes: 1, seconds: 0, speed: 25 },
      ],
      ADVANCED: [
        { order: 1, minutes: 0, seconds: 20, speed: 85 },
        { order: 2, minutes: 0, seconds: 40, speed: 30 },
      ],
    },
  };
}
