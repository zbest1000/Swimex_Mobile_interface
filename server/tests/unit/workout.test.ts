import { initDatabase, closeDatabase } from '../../src/database/connection';
import { runMigrations } from '../../src/database/migrate';
import { WorkoutEngine, getPresetWorkouts } from '../../src/workouts/workout-engine';
import { WorkoutState, TerminationType } from '../../src/shared/models';

describe('WorkoutEngine', () => {
  let engine: WorkoutEngine;
  const testDataDir = '/tmp/edge-test-workout-' + Date.now();

  beforeAll(() => {
    initDatabase(testDataDir);
    runMigrations();
  });

  afterAll(() => {
    closeDatabase();
  });

  beforeEach(() => {
    engine = new WorkoutEngine();
  });

  afterEach(() => {
    engine.stop(TerminationType.TABLET_END);
  });

  test('starts in IDLE state', () => {
    expect(engine.getState()).toBe(WorkoutState.IDLE);
    expect(engine.getActiveWorkout()).toBeNull();
  });

  test('Quick Start sets RUNNING state', () => {
    const workout = engine.startQuickStart(50, 60000, 'user1', 'AA:BB:CC:DD:EE:FF');
    expect(workout.state).toBe(WorkoutState.RUNNING);
    expect(workout.targetSpeed).toBe(50);
    expect(workout.type).toBe('QUICK_START');
  });

  test('pause transitions to PAUSED', () => {
    engine.startQuickStart(50, null, 'user1', 'AA:BB:CC:DD:EE:FF');
    engine.pause();
    expect(engine.getState()).toBe(WorkoutState.PAUSED);
  });

  test('resume transitions back to RUNNING', () => {
    engine.startQuickStart(50, null, 'user1', 'AA:BB:CC:DD:EE:FF');
    engine.pause();
    engine.resume();
    expect(engine.getState()).toBe(WorkoutState.RUNNING);
  });

  test('stop transitions to IDLE', () => {
    engine.startQuickStart(50, null, 'user1', 'AA:BB:CC:DD:EE:FF');
    engine.stop(TerminationType.TABLET_END);
    expect(engine.getState()).toBe(WorkoutState.IDLE);
    expect(engine.getActiveWorkout()).toBeNull();
  });

  test('safety stop transitions to SAFETY_STOP', () => {
    engine.startQuickStart(50, null, 'user1', 'AA:BB:CC:DD:EE:FF');
    engine.safetyStop();
    expect(engine.getState()).toBe(WorkoutState.SAFETY_STOP);
  });

  test('adjustSpeed changes current speed', () => {
    engine.startQuickStart(50, null, 'user1', 'AA:BB:CC:DD:EE:FF');
    engine.adjustSpeed(10);
    expect(engine.getActiveWorkout()?.targetSpeed).toBe(60);
    engine.adjustSpeed(-20);
    expect(engine.getActiveWorkout()?.targetSpeed).toBe(40);
  });

  test('speed clamps to 0-100', () => {
    engine.startQuickStart(95, null, 'user1', 'AA:BB:CC:DD:EE:FF');
    engine.adjustSpeed(20);
    expect(engine.getActiveWorkout()?.targetSpeed).toBe(100);
    engine.setSpeed(-5);
    expect(engine.getActiveWorkout()?.targetSpeed).toBe(0);
  });

  test('preset workouts are defined', () => {
    const presets = getPresetWorkouts();
    expect(presets.DISTANCE_PRESET).toBeDefined();
    expect(presets.SPRINT_PRESET).toBeDefined();
    expect(presets.DISTANCE_PRESET.BEGINNER.length).toBeGreaterThan(0);
    expect(presets.SPRINT_PRESET.ADVANCED.length).toBeGreaterThan(0);
  });
});
