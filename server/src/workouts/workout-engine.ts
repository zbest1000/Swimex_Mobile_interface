import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../database/connection';
import { tagDatabase } from '../tags/tag-database';
import { createLogger } from '../utils/logger';
import { WorkoutState, WorkoutType, TerminationType, FitnessLevel } from '../shared/models';
import type { WorkoutStep, SpeedSample } from '../shared/models';

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
  totalElapsedMs: number;
  speedLog: SpeedSample[];
  startedAt: number;
  deviceMAC: string;
}

export class WorkoutEngine extends EventEmitter {
  private active: ActiveWorkout | null = null;
  private tickTimer: NodeJS.Timeout | null = null;
  private speedSampleTimer: NodeJS.Timeout | null = null;
  private readonly TICK_INTERVAL_MS = 100;
  private readonly SPEED_SAMPLE_INTERVAL_MS = 5000;

  getActiveWorkout(): ActiveWorkout | null {
    return this.active ? { ...this.active } : null;
  }

  getState(): WorkoutState {
    return this.active?.state ?? WorkoutState.IDLE;
  }

  startQuickStart(speed: number, timeMs: number | null, userId: string | null, deviceMAC: string): ActiveWorkout {
    if (this.active && this.active.state === WorkoutState.RUNNING) {
      this.stop(TerminationType.TABLET_END);
    }

    const steps: WorkoutStep[] = [{
      order: 1,
      minutes: timeMs ? Math.floor(timeMs / 60000) : 0,
      seconds: timeMs ? Math.floor((timeMs % 60000) / 1000) : 0,
      speed,
    }];

    this.active = {
      sessionId: uuidv4(),
      userId,
      programId: null,
      programName: 'Quick Start',
      type: 'QUICK_START',
      state: WorkoutState.RUNNING,
      sets: 1,
      currentSet: 1,
      steps,
      currentStepIndex: 0,
      targetSpeed: speed,
      currentSpeed: speed,
      stepElapsedMs: 0,
      totalElapsedMs: 0,
      speedLog: [],
      startedAt: Date.now(),
      deviceMAC,
    };

    this.startTicking();
    this.writeSpeedToPlc(speed);
    this.emit('workout:started', this.active);
    log.info(`Quick Start: speed=${speed}%, time=${timeMs ?? 'unlimited'}ms`);

    return { ...this.active };
  }

  startProgram(programId: string, userId: string | null, deviceMAC: string): ActiveWorkout {
    const db = getDb();
    const program = db.prepare('SELECT * FROM workout_programs WHERE id = ?').get(programId) as Record<string, unknown> | undefined;
    if (!program) throw new Error('Program not found');

    if (this.active && this.active.state === WorkoutState.RUNNING) {
      this.stop(TerminationType.TABLET_END);
    }

    const steps = JSON.parse(program.steps as string) as WorkoutStep[];

    this.active = {
      sessionId: uuidv4(),
      userId,
      programId,
      programName: program.name as string,
      type: program.type as WorkoutType,
      state: WorkoutState.RUNNING,
      sets: program.sets as number,
      currentSet: 1,
      steps,
      currentStepIndex: 0,
      targetSpeed: steps[0]?.speed ?? 0,
      currentSpeed: steps[0]?.speed ?? 0,
      stepElapsedMs: 0,
      totalElapsedMs: 0,
      speedLog: [],
      startedAt: Date.now(),
      deviceMAC,
    };

    this.startTicking();
    this.writeSpeedToPlc(this.active.targetSpeed);
    this.emit('workout:started', this.active);
    log.info(`Program started: "${program.name}" (${program.type}), ${steps.length} steps × ${program.sets} sets`);

    return { ...this.active };
  }

  pause(): void {
    if (!this.active || this.active.state !== WorkoutState.RUNNING) return;

    this.active.state = WorkoutState.PAUSED;
    this.stopTicking();
    this.writeSpeedToPlc(0);
    this.emit('workout:paused', this.active);
    log.info('Workout paused');
  }

  resume(): void {
    if (!this.active || this.active.state !== WorkoutState.PAUSED) return;

    this.active.state = WorkoutState.RUNNING;
    this.startTicking();
    this.writeSpeedToPlc(this.active.targetSpeed);
    this.emit('workout:resumed', this.active);
    log.info('Workout resumed');
  }

  stop(terminatedBy: TerminationType = TerminationType.TABLET_END): void {
    if (!this.active) return;

    this.active.state = WorkoutState.IDLE;
    this.stopTicking();
    this.writeSpeedToPlc(0);
    this.saveSession(terminatedBy);
    const finished = { ...this.active };
    this.active = null;
    this.emit('workout:stopped', finished, terminatedBy);
    log.info(`Workout stopped: ${terminatedBy}`);
  }

  safetyStop(): void {
    if (!this.active) return;

    this.active.state = WorkoutState.SAFETY_STOP;
    this.stopTicking();
    this.emit('workout:safety_stop', this.active);
    log.warn('SAFETY STOP triggered — heartbeat lost');
  }

  adjustSpeed(delta: number): void {
    if (!this.active || this.active.state !== WorkoutState.RUNNING) return;

    const newSpeed = Math.max(0, Math.min(100, this.active.targetSpeed + delta));
    this.active.targetSpeed = newSpeed;
    this.active.currentSpeed = newSpeed;
    this.writeSpeedToPlc(newSpeed);
    this.emit('workout:speed_changed', newSpeed);
  }

  setSpeed(speed: number): void {
    if (!this.active || this.active.state !== WorkoutState.RUNNING) return;

    const clamped = Math.max(0, Math.min(100, speed));
    this.active.targetSpeed = clamped;
    this.active.currentSpeed = clamped;
    this.writeSpeedToPlc(clamped);
    this.emit('workout:speed_changed', clamped);
  }

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

    const currentStep = this.active.steps[this.active.currentStepIndex];
    if (!currentStep) return;

    const stepDurationMs = (currentStep.minutes * 60 + currentStep.seconds) * 1000;

    // Quick start with no timer runs indefinitely
    if (stepDurationMs === 0) {
      this.emit('workout:tick', this.active);
      return;
    }

    if (this.active.stepElapsedMs >= stepDurationMs) {
      this.advanceStep();
    }

    this.emit('workout:tick', this.active);
  }

  private advanceStep(): void {
    if (!this.active) return;

    const nextStepIndex = this.active.currentStepIndex + 1;

    if (nextStepIndex >= this.active.steps.length) {
      // End of set
      if (this.active.currentSet < this.active.sets) {
        // More sets to go
        this.active.currentSet++;
        this.active.currentStepIndex = 0;
        this.active.stepElapsedMs = 0;
        const step = this.active.steps[0];
        this.active.targetSpeed = step.speed;
        this.active.currentSpeed = step.speed;
        this.writeSpeedToPlc(step.speed);
        this.emit('workout:set_changed', this.active.currentSet);
        log.info(`Set ${this.active.currentSet}/${this.active.sets}`);
      } else {
        // Program complete
        this.stop(TerminationType.TIMER_COMPLETE);
      }
    } else {
      this.active.currentStepIndex = nextStepIndex;
      this.active.stepElapsedMs = 0;
      const step = this.active.steps[nextStepIndex];
      this.active.targetSpeed = step.speed;
      this.active.currentSpeed = step.speed;
      this.writeSpeedToPlc(step.speed);
      this.emit('workout:step_changed', nextStepIndex);
      log.info(`Step ${nextStepIndex + 1}/${this.active.steps.length}: speed=${step.speed}%`);
    }
  }

  private sampleSpeed(): void {
    if (!this.active) return;
    this.active.speedLog.push({
      timestamp: new Date().toISOString(),
      speed: this.active.currentSpeed,
    });
  }

  private writeSpeedToPlc(speed: number): void {
    tagDatabase.writeTag(`swimex/${process.env.POOL_ID ?? 'default'}/command/speed`, speed, 'workout-engine');
    tagDatabase.writeTag(`swimex/${process.env.POOL_ID ?? 'default'}/status/target_speed`, speed, 'workout-engine');
  }

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
        this.active.currentStepIndex + 1,
        Math.round(this.active.totalElapsedMs / 1000),
        JSON.stringify(this.active.speedLog),
      );
    } catch (err) {
      log.error('Failed to save workout session', err);
    }
  }
}

export const workoutEngine = new WorkoutEngine();

// --- Preset workout factory ---

export function getPresetWorkouts(): Record<string, Record<string, WorkoutStep[]>> {
  return {
    DISTANCE_PRESET: {
      BEGINNER: [
        { order: 1, minutes: 5, seconds: 0, speed: 20 },
        { order: 2, minutes: 10, seconds: 0, speed: 30 },
        { order: 3, minutes: 5, seconds: 0, speed: 20 },
      ],
      INTERMEDIATE: [
        { order: 1, minutes: 5, seconds: 0, speed: 30 },
        { order: 2, minutes: 15, seconds: 0, speed: 50 },
        { order: 3, minutes: 5, seconds: 0, speed: 30 },
      ],
      ADVANCED: [
        { order: 1, minutes: 5, seconds: 0, speed: 40 },
        { order: 2, minutes: 20, seconds: 0, speed: 70 },
        { order: 3, minutes: 5, seconds: 0, speed: 40 },
      ],
    },
    SPRINT_PRESET: {
      BEGINNER: [
        { order: 1, minutes: 0, seconds: 30, speed: 50 },
        { order: 2, minutes: 1, seconds: 0, speed: 20 },
      ],
      INTERMEDIATE: [
        { order: 1, minutes: 0, seconds: 30, speed: 70 },
        { order: 2, minutes: 0, seconds: 45, speed: 25 },
      ],
      ADVANCED: [
        { order: 1, minutes: 0, seconds: 20, speed: 90 },
        { order: 2, minutes: 0, seconds: 30, speed: 30 },
      ],
    },
  };
}
