import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../../database/connection';
import { authenticate, optionalAuth, checkDeviceRegistration, requireRegisteredDevice } from '../../auth/middleware';
import { workoutEngine, getPresetWorkouts } from '../../workouts/workout-engine';
import { TerminationType, WorkoutType, FitnessLevel } from '../../shared/models';
import { ValidationError, NotFoundError } from '../../utils/errors';

const router = Router();

const writeMiddleware = [authenticate, checkDeviceRegistration, requireRegisteredDevice];

// --- Active workout state ---

router.get('/active', optionalAuth, (_req: Request, res: Response) => {
  res.json({ success: true, data: workoutEngine.getActiveWorkout() });
});

router.get('/state', (_req: Request, res: Response) => {
  res.json({ success: true, data: { state: workoutEngine.getState() } });
});

// --- Start workouts ---

router.post('/quick-start', ...writeMiddleware, (req: Request, res: Response, next: NextFunction) => {
  try {
    const { speed, durationMs } = req.body;
    if (speed === undefined || typeof speed !== 'number' || speed < 0 || speed > 100) {
      throw new ValidationError('Speed must be a number between 0 and 100');
    }
    if (durationMs !== undefined && durationMs !== null && (typeof durationMs !== 'number' || durationMs < 0)) {
      throw new ValidationError('durationMs must be a positive number or null for unlimited');
    }
    const workout = workoutEngine.startQuickStart(speed, durationMs ?? null, req.user!.userId, req.macAddress ?? 'unknown');
    res.json({ success: true, data: workout });
  } catch (err) { next(err); }
});

router.post('/start-program', ...writeMiddleware, (req: Request, res: Response, next: NextFunction) => {
  try {
    const { programId } = req.body;
    if (!programId) throw new ValidationError('programId is required');
    const workout = workoutEngine.startProgram(programId, req.user!.userId, req.macAddress ?? 'unknown');
    res.json({ success: true, data: workout });
  } catch (err) { next(err); }
});

router.post('/start-preset', ...writeMiddleware, (req: Request, res: Response, next: NextFunction) => {
  try {
    const { type, level } = req.body;
    if (!type || !Object.values(WorkoutType).includes(type)) throw new ValidationError('Invalid workout type');
    if (!level || !Object.values(FitnessLevel).includes(level)) throw new ValidationError('Invalid fitness level');
    const workout = workoutEngine.startPreset(type, level, req.user!.userId, req.macAddress ?? 'unknown');
    res.json({ success: true, data: workout });
  } catch (err) { next(err); }
});

router.post('/start-interval', ...writeMiddleware, (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sets, step1, step2 } = req.body;
    if (!sets || sets < 1) throw new ValidationError('sets must be >= 1');
    if (!step1 || !step2) throw new ValidationError('step1 and step2 are required');
    if (step1.speed === undefined || step2.speed === undefined) throw new ValidationError('Each step requires a speed');
    const workout = workoutEngine.startInterval(sets, step1, step2, req.user!.userId, req.macAddress ?? 'unknown');
    res.json({ success: true, data: workout });
  } catch (err) { next(err); }
});

// --- Controls ---

router.post('/pause', ...writeMiddleware, (_req: Request, res: Response) => {
  const workout = workoutEngine.pause();
  res.json({ success: true, data: workout });
});

router.post('/resume', ...writeMiddleware, (_req: Request, res: Response) => {
  const workout = workoutEngine.resume();
  res.json({ success: true, data: workout });
});

router.post('/stop', ...writeMiddleware, (_req: Request, res: Response) => {
  workoutEngine.stop(TerminationType.TABLET_END);
  res.json({ success: true });
});

router.post('/set-speed', ...writeMiddleware, (req: Request, res: Response, next: NextFunction) => {
  try {
    const { speed } = req.body;
    if (speed === undefined || typeof speed !== 'number') throw new ValidationError('speed must be a number');
    workoutEngine.setSpeed(speed);
    res.json({ success: true, data: { speed: workoutEngine.getActiveWorkout()?.targetSpeed } });
  } catch (err) { next(err); }
});

router.post('/adjust-speed', ...writeMiddleware, (req: Request, res: Response, next: NextFunction) => {
  try {
    const { delta } = req.body;
    if (delta === undefined || typeof delta !== 'number') throw new ValidationError('delta must be a number');
    workoutEngine.adjustSpeed(delta);
    res.json({ success: true, data: { speed: workoutEngine.getActiveWorkout()?.targetSpeed } });
  } catch (err) { next(err); }
});

// --- Workout programs CRUD ---

router.get('/programs', authenticate, (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const userId = req.user!.userId;
    const type = req.query.type as string | undefined;
    const publicOnly = req.query.public === 'true';

    let query = 'SELECT * FROM workout_programs WHERE (owner_id = ? OR is_public = 1)';
    const params: unknown[] = [userId];

    if (type) { query += ' AND type = ?'; params.push(type); }
    if (publicOnly) { query += ' AND is_public = 1'; }
    query += ' ORDER BY updated_at DESC';

    const programs = db.prepare(query).all(...params) as Record<string, unknown>[];

    const result = programs.map(p => ({
      ...p,
      steps: JSON.parse(p.steps as string),
      isPublic: Boolean(p.is_public),
    }));

    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

router.get('/programs/:id', authenticate, (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const program = db.prepare('SELECT * FROM workout_programs WHERE id = ?').get(req.params.id) as Record<string, unknown> | undefined;
    if (!program) throw new NotFoundError('Program not found');
    res.json({ success: true, data: { ...program, steps: JSON.parse(program.steps as string), isPublic: Boolean(program.is_public) } });
  } catch (err) { next(err); }
});

router.post('/programs', authenticate, (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, type, sets, steps, level, isPublic } = req.body;
    if (!name || typeof name !== 'string' || name.trim().length === 0) throw new ValidationError('Program name is required');
    if (!type || !Object.values(WorkoutType).includes(type)) throw new ValidationError('Invalid workout type');
    if (sets !== undefined && (typeof sets !== 'number' || sets < 1)) throw new ValidationError('sets must be >= 1');
    if (steps && !Array.isArray(steps)) throw new ValidationError('steps must be an array');
    if (steps && steps.length > 10) throw new ValidationError('Maximum 10 steps per program');

    // Validate each step
    if (steps) {
      for (let i = 0; i < steps.length; i++) {
        const s = steps[i];
        if (typeof s.speed !== 'number' || s.speed < 0 || s.speed > 100) {
          throw new ValidationError(`Step ${i + 1}: speed must be 0-100`);
        }
        if (s.minutes !== undefined && (typeof s.minutes !== 'number' || s.minutes < 0 || s.minutes > 480)) {
          throw new ValidationError(`Step ${i + 1}: minutes must be 0-480`);
        }
        if (s.seconds !== undefined && (typeof s.seconds !== 'number' || s.seconds < 0 || s.seconds > 59)) {
          throw new ValidationError(`Step ${i + 1}: seconds must be 0-59`);
        }
      }
    }

    const db = getDb();
    const id = uuidv4();
    const orderedSteps = (steps ?? []).map((s: any, i: number) => ({
      order: i + 1,
      minutes: s.minutes ?? 0,
      seconds: s.seconds ?? 0,
      speed: s.speed,
    }));

    db.prepare(`
      INSERT INTO workout_programs (id, owner_id, name, type, sets, steps, level, is_public)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, req.user!.userId, name.trim(), type, sets ?? 1, JSON.stringify(orderedSteps), level ?? null, isPublic ? 1 : 0);

    const program = db.prepare('SELECT * FROM workout_programs WHERE id = ?').get(id) as Record<string, unknown>;
    res.status(201).json({ success: true, data: { ...program, steps: orderedSteps, isPublic: Boolean(program.is_public) } });
  } catch (err) { next(err); }
});

router.put('/programs/:id', authenticate, (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM workout_programs WHERE id = ? AND owner_id = ?').get(req.params.id, req.user!.userId);
    if (!existing) throw new NotFoundError('Program not found or not owned by you');

    const { name, sets, steps, isPublic } = req.body;
    const fields: string[] = ["updated_at = datetime('now')"];
    const values: unknown[] = [];

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) throw new ValidationError('Name cannot be empty');
      fields.push('name = ?'); values.push(name.trim());
    }
    if (sets !== undefined) {
      if (typeof sets !== 'number' || sets < 1) throw new ValidationError('sets must be >= 1');
      fields.push('sets = ?'); values.push(sets);
    }
    if (steps !== undefined) {
      if (!Array.isArray(steps) || steps.length > 10) throw new ValidationError('steps must be an array of max 10 items');
      const orderedSteps = steps.map((s: any, i: number) => ({ order: i + 1, minutes: s.minutes ?? 0, seconds: s.seconds ?? 0, speed: s.speed }));
      fields.push('steps = ?'); values.push(JSON.stringify(orderedSteps));
    }
    if (isPublic !== undefined) { fields.push('is_public = ?'); values.push(isPublic ? 1 : 0); }

    values.push(req.params.id);
    db.prepare(`UPDATE workout_programs SET ${fields.join(', ')} WHERE id = ?`).run(...values);

    const program = db.prepare('SELECT * FROM workout_programs WHERE id = ?').get(req.params.id) as Record<string, unknown>;
    res.json({ success: true, data: { ...program, steps: JSON.parse(program.steps as string), isPublic: Boolean(program.is_public) } });
  } catch (err) { next(err); }
});

router.post('/programs/:id/clone', authenticate, (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const original = db.prepare('SELECT * FROM workout_programs WHERE id = ?').get(req.params.id) as Record<string, unknown> | undefined;
    if (!original) throw new NotFoundError('Program not found');

    const newName = req.body.name ?? `${original.name} (Copy)`;
    const id = uuidv4();

    db.prepare(`
      INSERT INTO workout_programs (id, owner_id, name, type, sets, steps, level, is_public)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0)
    `).run(id, req.user!.userId, newName, original.type, original.sets, original.steps, original.level);

    const program = db.prepare('SELECT * FROM workout_programs WHERE id = ?').get(id) as Record<string, unknown>;
    res.status(201).json({ success: true, data: { ...program, steps: JSON.parse(program.steps as string) } });
  } catch (err) { next(err); }
});

router.delete('/programs/:id', authenticate, (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const result = db.prepare('DELETE FROM workout_programs WHERE id = ? AND owner_id = ?').run(req.params.id, req.user!.userId);
    if (result.changes === 0) throw new NotFoundError('Program not found or not owned by you');
    res.json({ success: true });
  } catch (err) { next(err); }
});

// --- Presets ---

router.get('/presets', (_req: Request, res: Response) => {
  res.json({ success: true, data: getPresetWorkouts() });
});

// --- Workout history ---

router.get('/history', authenticate, (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const offset = parseInt(req.query.offset as string) || 0;
    const userId = req.user!.userId;

    const total = (db.prepare('SELECT COUNT(*) as count FROM workout_sessions WHERE user_id = ?').get(userId) as { count: number }).count;
    const sessions = db.prepare(`
      SELECT ws.*, wp.name as program_name, wp.type as program_type
      FROM workout_sessions ws
      LEFT JOIN workout_programs wp ON ws.program_id = wp.id
      WHERE ws.user_id = ?
      ORDER BY ws.started_at DESC
      LIMIT ? OFFSET ?
    `).all(userId, limit, offset) as Record<string, unknown>[];

    const data = sessions.map(s => ({
      ...s,
      speedLog: JSON.parse(s.speed_log as string || '[]'),
    }));

    res.json({ success: true, data, meta: { total, page: Math.floor(offset / limit) + 1, pageSize: limit } });
  } catch (err) { next(err); }
});

// --- Usage stats ---

router.get('/stats', authenticate, (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const userId = req.user!.userId;

    const overview = db.prepare(`
      SELECT 
        COUNT(*) as total_sessions,
        COALESCE(SUM(total_duration), 0) as total_swim_time_seconds,
        COALESCE(AVG(total_duration), 0) as avg_duration_seconds,
        COALESCE(MAX(total_duration), 0) as longest_session_seconds,
        MAX(started_at) as last_workout
      FROM workout_sessions WHERE user_id = ?
    `).get(userId);

    const byMode = db.prepare(`
      SELECT wp.type as workout_type, COUNT(*) as count, SUM(ws.total_duration) as total_duration
      FROM workout_sessions ws
      LEFT JOIN workout_programs wp ON ws.program_id = wp.id
      WHERE ws.user_id = ?
      GROUP BY wp.type
    `).all(userId);

    const byTermination = db.prepare(`
      SELECT terminated_by, COUNT(*) as count
      FROM workout_sessions WHERE user_id = ?
      GROUP BY terminated_by
    `).all(userId);

    const recentSessions = db.prepare(`
      SELECT started_at, total_duration
      FROM workout_sessions WHERE user_id = ?
      ORDER BY started_at DESC LIMIT 30
    `).all(userId);

    res.json({
      success: true,
      data: { overview, byMode, byTermination, recentSessions },
    });
  } catch (err) { next(err); }
});

export default router;
