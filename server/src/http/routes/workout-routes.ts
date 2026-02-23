import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../../database/connection';
import { authenticate, optionalAuth, checkDeviceRegistration, requireRegisteredDevice } from '../../auth/middleware';
import { workoutEngine, getPresetWorkouts } from '../../workouts/workout-engine';
import { TerminationType, WorkoutType } from '../../shared/models';
import { ValidationError, NotFoundError } from '../../utils/errors';

const router = Router();

// --- Active workout control ---

router.get('/active', optionalAuth, (_req: Request, res: Response) => {
  const workout = workoutEngine.getActiveWorkout();
  res.json({ success: true, data: workout });
});

router.post('/quick-start', authenticate, checkDeviceRegistration, requireRegisteredDevice, (req: Request, res: Response, next: NextFunction) => {
  try {
    const { speed, timeMs } = req.body;
    if (speed === undefined || speed < 0 || speed > 100) throw new ValidationError('Speed must be 0-100');
    const workout = workoutEngine.startQuickStart(speed, timeMs ?? null, req.user!.userId, req.macAddress ?? 'unknown');
    res.json({ success: true, data: workout });
  } catch (err) { next(err); }
});

router.post('/start-program', authenticate, checkDeviceRegistration, requireRegisteredDevice, (req: Request, res: Response, next: NextFunction) => {
  try {
    const { programId } = req.body;
    if (!programId) throw new ValidationError('programId is required');
    const workout = workoutEngine.startProgram(programId, req.user!.userId, req.macAddress ?? 'unknown');
    res.json({ success: true, data: workout });
  } catch (err) { next(err); }
});

router.post('/pause', authenticate, checkDeviceRegistration, requireRegisteredDevice, (_req: Request, res: Response) => {
  workoutEngine.pause();
  res.json({ success: true, data: workoutEngine.getActiveWorkout() });
});

router.post('/resume', authenticate, checkDeviceRegistration, requireRegisteredDevice, (_req: Request, res: Response) => {
  workoutEngine.resume();
  res.json({ success: true, data: workoutEngine.getActiveWorkout() });
});

router.post('/stop', authenticate, checkDeviceRegistration, requireRegisteredDevice, (_req: Request, res: Response) => {
  workoutEngine.stop(TerminationType.TABLET_END);
  res.json({ success: true });
});

router.post('/set-speed', authenticate, checkDeviceRegistration, requireRegisteredDevice, (req: Request, res: Response, next: NextFunction) => {
  try {
    const { speed } = req.body;
    if (speed === undefined) throw new ValidationError('speed is required');
    workoutEngine.setSpeed(speed);
    res.json({ success: true, data: { speed } });
  } catch (err) { next(err); }
});

router.post('/adjust-speed', authenticate, checkDeviceRegistration, requireRegisteredDevice, (req: Request, res: Response, next: NextFunction) => {
  try {
    const { delta } = req.body;
    if (delta === undefined) throw new ValidationError('delta is required');
    workoutEngine.adjustSpeed(delta);
    res.json({ success: true });
  } catch (err) { next(err); }
});

// --- Workout programs CRUD ---

router.get('/programs', authenticate, (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const userId = req.user!.userId;
    const programs = db.prepare(
      'SELECT * FROM workout_programs WHERE owner_id = ? OR is_public = 1 ORDER BY updated_at DESC'
    ).all(userId);
    res.json({ success: true, data: programs });
  } catch (err) { next(err); }
});

router.get('/programs/:id', authenticate, (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const program = db.prepare('SELECT * FROM workout_programs WHERE id = ?').get(req.params.id);
    if (!program) throw new NotFoundError('Program not found');
    res.json({ success: true, data: program });
  } catch (err) { next(err); }
});

router.post('/programs', authenticate, (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, type, sets, steps, level, isPublic } = req.body;
    if (!name) throw new ValidationError('Program name is required');
    if (!type || !Object.values(WorkoutType).includes(type)) throw new ValidationError('Invalid workout type');

    const db = getDb();
    const id = uuidv4();

    db.prepare(`
      INSERT INTO workout_programs (id, owner_id, name, type, sets, steps, level, is_public)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, req.user!.userId, name, type, sets ?? 1, JSON.stringify(steps ?? []), level ?? null, isPublic ? 1 : 0);

    const program = db.prepare('SELECT * FROM workout_programs WHERE id = ?').get(id);
    res.status(201).json({ success: true, data: program });
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

    if (name !== undefined) { fields.push('name = ?'); values.push(name); }
    if (sets !== undefined) { fields.push('sets = ?'); values.push(sets); }
    if (steps !== undefined) { fields.push('steps = ?'); values.push(JSON.stringify(steps)); }
    if (isPublic !== undefined) { fields.push('is_public = ?'); values.push(isPublic ? 1 : 0); }

    values.push(req.params.id);
    db.prepare(`UPDATE workout_programs SET ${fields.join(', ')} WHERE id = ?`).run(...values);

    const program = db.prepare('SELECT * FROM workout_programs WHERE id = ?').get(req.params.id);
    res.json({ success: true, data: program });
  } catch (err) { next(err); }
});

router.delete('/programs/:id', authenticate, (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    db.prepare('DELETE FROM workout_programs WHERE id = ? AND owner_id = ?').run(req.params.id, req.user!.userId);
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
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const total = (db.prepare('SELECT COUNT(*) as count FROM workout_sessions WHERE user_id = ?').get(req.user!.userId) as { count: number }).count;
    const sessions = db.prepare(
      'SELECT * FROM workout_sessions WHERE user_id = ? ORDER BY started_at DESC LIMIT ? OFFSET ?'
    ).all(req.user!.userId, limit, offset);

    res.json({ success: true, data: sessions, meta: { total, page: Math.floor(offset / limit) + 1, pageSize: limit } });
  } catch (err) { next(err); }
});

// --- Usage stats ---

router.get('/stats', authenticate, (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const userId = req.user!.userId;

    const stats = db.prepare(`
      SELECT 
        COUNT(*) as totalSessions,
        COALESCE(SUM(total_duration), 0) as totalSwimTimeSeconds,
        COALESCE(AVG(total_duration), 0) as avgDurationSeconds,
        MAX(started_at) as lastWorkout
      FROM workout_sessions WHERE user_id = ?
    `).get(userId);

    const modeBreakdown = db.prepare(`
      SELECT wp.type, COUNT(*) as count
      FROM workout_sessions ws
      LEFT JOIN workout_programs wp ON ws.program_id = wp.id
      WHERE ws.user_id = ?
      GROUP BY wp.type
    `).all(userId);

    res.json({ success: true, data: { stats, modeBreakdown } });
  } catch (err) { next(err); }
});

export default router;
