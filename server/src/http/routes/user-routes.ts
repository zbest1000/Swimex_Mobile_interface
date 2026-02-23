import { Router, Request, Response, NextFunction } from 'express';
import * as authService from '../../auth/auth-service';
import { authenticate, requireAdmin, requireSuperAdmin } from '../../auth/middleware';
import { UserRole } from '../../shared/models';

const router = Router();

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
