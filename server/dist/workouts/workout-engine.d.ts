import { EventEmitter } from 'events';
import { WorkoutState, WorkoutType, TerminationType } from '../shared/models';
import type { WorkoutStep, SpeedSample } from '../shared/models';
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
export declare class WorkoutEngine extends EventEmitter {
    private active;
    private tickTimer;
    private speedSampleTimer;
    private readonly TICK_INTERVAL_MS;
    private readonly SPEED_SAMPLE_INTERVAL_MS;
    getActiveWorkout(): ActiveWorkout | null;
    getState(): WorkoutState;
    startQuickStart(speed: number, timeMs: number | null, userId: string | null, deviceMAC: string): ActiveWorkout;
    startProgram(programId: string, userId: string | null, deviceMAC: string): ActiveWorkout;
    pause(): void;
    resume(): void;
    stop(terminatedBy?: TerminationType): void;
    safetyStop(): void;
    adjustSpeed(delta: number): void;
    setSpeed(speed: number): void;
    private startTicking;
    private stopTicking;
    private tick;
    private advanceStep;
    private sampleSpeed;
    private writeSpeedToPlc;
    private saveSession;
}
export declare const workoutEngine: WorkoutEngine;
export declare function getPresetWorkouts(): Record<string, Record<string, WorkoutStep[]>>;
//# sourceMappingURL=workout-engine.d.ts.map