import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import * as authService from '../../auth/auth-service';
import { authenticate, requireAdmin, requireSuperAdmin } from '../../auth/middleware';
import { UserRole } from '../../shared/models';

const router = Router();
const profileUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } });

// --- Current user (self) endpoints ---
router.get('/me', authenticate, (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = authService.getUserById(req.user!.userId);
    if (!user) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } });
    const prefs = authService.getUserPreferences(req.user!.userId);
    res.json({ success: true, data: { ...user, preferences: prefs } });
  } catch (err) { next(err); }
});

router.patch('/me/preferences', authenticate, (req: Request, res: Response, next: NextFunction) => {
  try {
    authService.updateUserPreferences(req.user!.userId, req.body);
    const prefs = authService.getUserPreferences(req.user!.userId);
    res.json({ success: true, data: prefs });
  } catch (err) { next(err); }
});

router.put('/me/password', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'currentPassword and newPassword are required' } });
    }
    const { getDb } = require('../../database/connection');
    const db = getDb();
    const row = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user!.userId) as { password_hash: string } | undefined;
    if (!row) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } });

    const valid = await authService.verifyPassword(row.password_hash, currentPassword);
    if (!valid) return res.status(400).json({ success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Current password is incorrect' } });

    await authService.updatePassword(req.user!.userId, newPassword);
    res.json({ success: true });
  } catch (err) { next(err); }
});

router.post('/me/profile-photo', authenticate, profileUpload.single('photo'), (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Photo file is required' } });
    const { getDb } = require('../../database/connection');
    const db = getDb();
    db.prepare('UPDATE users SET profile_photo = ? WHERE id = ?').run(req.file.buffer, req.user!.userId);
    res.json({ success: true });
  } catch (err) { next(err); }
});

// --- Admin user management endpoints ---
router.get('/', authenticate, requireAdmin, (req: Request, res: Response, next: NextFunction) => {
  try {
    const role = req.query.role as UserRole | undefined;
    const users = authService.listUsers(role);
    res.json({ success: true, data: users });
  } catch (err) { next(err); }
});

router.get('/:id', authenticate, requireAdmin, (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = authService.getUserById(req.params.id);
    if (!user) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } });
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
});

router.post('/', authenticate, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username, password, displayName, role, email } = req.body;
    const user = await authService.createUser(username, password, displayName, role, email, req.user!.userId);
    res.status(201).json({ success: true, data: user });
  } catch (err) { next(err); }
});

router.put('/:id/role', authenticate, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await authService.updateUserRole(req.params.id, req.body.role, req.user!.userId);
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
});

router.put('/:id/password', authenticate, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await authService.updatePassword(req.params.id, req.body.newPassword, req.user!.userId);
    res.json({ success: true });
  } catch (err) { next(err); }
});

router.put('/:id/disable', authenticate, requireAdmin, (req: Request, res: Response, next: NextFunction) => {
  try {
    authService.disableUser(req.params.id, req.user!.userId);
    res.json({ success: true });
  } catch (err) { next(err); }
});

router.put('/:id/enable', authenticate, requireAdmin, (req: Request, res: Response, next: NextFunction) => {
  try {
    authService.enableUser(req.params.id, req.user!.userId);
    res.json({ success: true });
  } catch (err) { next(err); }
});

router.delete('/:id', authenticate, requireAdmin, (req: Request, res: Response, next: NextFunction) => {
  try {
    authService.deleteUser(req.params.id, req.user!.userId);
    res.json({ success: true });
  } catch (err) { next(err); }
});

export default router;
