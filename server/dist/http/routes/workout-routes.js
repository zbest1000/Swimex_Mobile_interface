"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const uuid_1 = require("uuid");
const connection_1 = require("../../database/connection");
const middleware_1 = require("../../auth/middleware");
const workout_engine_1 = require("../../workouts/workout-engine");
const models_1 = require("../../shared/models");
const errors_1 = require("../../utils/errors");
const router = (0, express_1.Router)();
// --- Active workout control ---
router.get('/active', middleware_1.optionalAuth, (_req, res) => {
    const workout = workout_engine_1.workoutEngine.getActiveWorkout();
    res.json({ success: true, data: workout });
});
router.post('/quick-start', middleware_1.authenticate, middleware_1.checkDeviceRegistration, middleware_1.requireRegisteredDevice, (req, res, next) => {
    try {
        const { speed, timeMs } = req.body;
        if (speed === undefined || speed < 0 || speed > 100)
            throw new errors_1.ValidationError('Speed must be 0-100');
        const workout = workout_engine_1.workoutEngine.startQuickStart(speed, timeMs ?? null, req.user.userId, req.macAddress ?? 'unknown');
        res.json({ success: true, data: workout });
    }
    catch (err) {
        next(err);
    }
});
router.post('/start-program', middleware_1.authenticate, middleware_1.checkDeviceRegistration, middleware_1.requireRegisteredDevice, (req, res, next) => {
    try {
        const { programId } = req.body;
        if (!programId)
            throw new errors_1.ValidationError('programId is required');
        const workout = workout_engine_1.workoutEngine.startProgram(programId, req.user.userId, req.macAddress ?? 'unknown');
        res.json({ success: true, data: workout });
    }
    catch (err) {
        next(err);
    }
});
router.post('/pause', middleware_1.authenticate, middleware_1.checkDeviceRegistration, middleware_1.requireRegisteredDevice, (_req, res) => {
    workout_engine_1.workoutEngine.pause();
    res.json({ success: true, data: workout_engine_1.workoutEngine.getActiveWorkout() });
});
router.post('/resume', middleware_1.authenticate, middleware_1.checkDeviceRegistration, middleware_1.requireRegisteredDevice, (_req, res) => {
    workout_engine_1.workoutEngine.resume();
    res.json({ success: true, data: workout_engine_1.workoutEngine.getActiveWorkout() });
});
router.post('/stop', middleware_1.authenticate, middleware_1.checkDeviceRegistration, middleware_1.requireRegisteredDevice, (_req, res) => {
    workout_engine_1.workoutEngine.stop(models_1.TerminationType.TABLET_END);
    res.json({ success: true });
});
router.post('/set-speed', middleware_1.authenticate, middleware_1.checkDeviceRegistration, middleware_1.requireRegisteredDevice, (req, res, next) => {
    try {
        const { speed } = req.body;
        if (speed === undefined)
            throw new errors_1.ValidationError('speed is required');
        workout_engine_1.workoutEngine.setSpeed(speed);
        res.json({ success: true, data: { speed } });
    }
    catch (err) {
        next(err);
    }
});
router.post('/adjust-speed', middleware_1.authenticate, middleware_1.checkDeviceRegistration, middleware_1.requireRegisteredDevice, (req, res, next) => {
    try {
        const { delta } = req.body;
        if (delta === undefined)
            throw new errors_1.ValidationError('delta is required');
        workout_engine_1.workoutEngine.adjustSpeed(delta);
        res.json({ success: true });
    }
    catch (err) {
        next(err);
    }
});
// --- Workout programs CRUD ---
router.get('/programs', middleware_1.authenticate, (req, res, next) => {
    try {
        const db = (0, connection_1.getDb)();
        const userId = req.user.userId;
        const programs = db.prepare('SELECT * FROM workout_programs WHERE owner_id = ? OR is_public = 1 ORDER BY updated_at DESC').all(userId);
        res.json({ success: true, data: programs });
    }
    catch (err) {
        next(err);
    }
});
router.get('/programs/:id', middleware_1.authenticate, (req, res, next) => {
    try {
        const db = (0, connection_1.getDb)();
        const program = db.prepare('SELECT * FROM workout_programs WHERE id = ?').get(req.params.id);
        if (!program)
            throw new errors_1.NotFoundError('Program not found');
        res.json({ success: true, data: program });
    }
    catch (err) {
        next(err);
    }
});
router.post('/programs', middleware_1.authenticate, (req, res, next) => {
    try {
        const { name, type, sets, steps, level, isPublic } = req.body;
        if (!name)
            throw new errors_1.ValidationError('Program name is required');
        if (!type || !Object.values(models_1.WorkoutType).includes(type))
            throw new errors_1.ValidationError('Invalid workout type');
        const db = (0, connection_1.getDb)();
        const id = (0, uuid_1.v4)();
        db.prepare(`
      INSERT INTO workout_programs (id, owner_id, name, type, sets, steps, level, is_public)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, req.user.userId, name, type, sets ?? 1, JSON.stringify(steps ?? []), level ?? null, isPublic ? 1 : 0);
        const program = db.prepare('SELECT * FROM workout_programs WHERE id = ?').get(id);
        res.status(201).json({ success: true, data: program });
    }
    catch (err) {
        next(err);
    }
});
router.put('/programs/:id', middleware_1.authenticate, (req, res, next) => {
    try {
        const db = (0, connection_1.getDb)();
        const existing = db.prepare('SELECT * FROM workout_programs WHERE id = ? AND owner_id = ?').get(req.params.id, req.user.userId);
        if (!existing)
            throw new errors_1.NotFoundError('Program not found or not owned by you');
        const { name, sets, steps, isPublic } = req.body;
        const fields = ["updated_at = datetime('now')"];
        const values = [];
        if (name !== undefined) {
            fields.push('name = ?');
            values.push(name);
        }
        if (sets !== undefined) {
            fields.push('sets = ?');
            values.push(sets);
        }
        if (steps !== undefined) {
            fields.push('steps = ?');
            values.push(JSON.stringify(steps));
        }
        if (isPublic !== undefined) {
            fields.push('is_public = ?');
            values.push(isPublic ? 1 : 0);
        }
        values.push(req.params.id);
        db.prepare(`UPDATE workout_programs SET ${fields.join(', ')} WHERE id = ?`).run(...values);
        const program = db.prepare('SELECT * FROM workout_programs WHERE id = ?').get(req.params.id);
        res.json({ success: true, data: program });
    }
    catch (err) {
        next(err);
    }
});
router.delete('/programs/:id', middleware_1.authenticate, (req, res, next) => {
    try {
        const db = (0, connection_1.getDb)();
        db.prepare('DELETE FROM workout_programs WHERE id = ? AND owner_id = ?').run(req.params.id, req.user.userId);
        res.json({ success: true });
    }
    catch (err) {
        next(err);
    }
});
// --- Presets ---
router.get('/presets', (_req, res) => {
    res.json({ success: true, data: (0, workout_engine_1.getPresetWorkouts)() });
});
// --- Workout history ---
router.get('/history', middleware_1.authenticate, (req, res, next) => {
    try {
        const db = (0, connection_1.getDb)();
        const limit = parseInt(req.query.limit) || 50;
        const offset = parseInt(req.query.offset) || 0;
        const total = db.prepare('SELECT COUNT(*) as count FROM workout_sessions WHERE user_id = ?').get(req.user.userId).count;
        const sessions = db.prepare('SELECT * FROM workout_sessions WHERE user_id = ? ORDER BY started_at DESC LIMIT ? OFFSET ?').all(req.user.userId, limit, offset);
        res.json({ success: true, data: sessions, meta: { total, page: Math.floor(offset / limit) + 1, pageSize: limit } });
    }
    catch (err) {
        next(err);
    }
});
// --- Usage stats ---
router.get('/stats', middleware_1.authenticate, (req, res, next) => {
    try {
        const db = (0, connection_1.getDb)();
        const userId = req.user.userId;
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
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
//# sourceMappingURL=workout-routes.js.map