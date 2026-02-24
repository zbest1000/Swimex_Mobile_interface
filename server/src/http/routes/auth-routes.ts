import { Router, Request, Response, NextFunction } from 'express';
import * as authService from '../../auth/auth-service';
import { authenticate, requireSuperAdmin } from '../../auth/middleware';
import { UserRole, CommissioningOrg } from '../../shared/models';
import { ValidationError } from '../../utils/errors';

const router = Router();

router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username, password, displayName, email } = req.body;
    const user = await authService.createUser(username, password, displayName, UserRole.USER, email);
    const { token } = await authService.login(username, password);
    res.status(201).json({ success: true, data: { user, token } });
  } catch (err) { next(err); }
});

router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username, password } = req.body;
    const sourceIp = req.ip || req.socket.remoteAddress;
    const result = await authService.login(username, password, sourceIp);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

router.post('/logout', authenticate, (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.slice(7);
    if (token) {
      const db = require('../../database/connection').getDb();
      db.prepare('UPDATE sessions SET is_revoked = 1 WHERE token = ?').run(token);
    }
    res.json({ success: true });
  } catch (err) { next(err); }
});

router.get('/me', authenticate, (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = authService.getUserById(req.user!.userId);
    const prefs = authService.getUserPreferences(req.user!.userId);
    res.json({ success: true, data: { user, preferences: prefs } });
  } catch (err) { next(err); }
});

router.put('/me/preferences', authenticate, (req: Request, res: Response, next: NextFunction) => {
  try {
    authService.updateUserPreferences(req.user!.userId, req.body);
    const prefs = authService.getUserPreferences(req.user!.userId);
    res.json({ success: true, data: prefs });
  } catch (err) { next(err); }
});

router.put('/me/password', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { newPassword } = req.body;
    await authService.updatePassword(req.user!.userId, newPassword);
    res.json({ success: true });
  } catch (err) { next(err); }
});

router.get('/commissioned', (_req: Request, res: Response) => {
  res.json({ success: true, data: { commissioned: authService.isCommissioned() } });
});

router.post('/commission', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (authService.isCommissioned()) {
      throw new ValidationError('Server is already commissioned');
    }
    const { swimexCode, bscCode, superAdminUsername, superAdminPassword, adminUsername, adminPassword } = req.body;
    if (!swimexCode || !bscCode) throw new ValidationError('Both commissioning codes are required');

    await authService.setCommissioningCode(CommissioningOrg.SWIMEX, swimexCode);
    await authService.setCommissioningCode(CommissioningOrg.BSC_INDUSTRIES, bscCode);

    const superAdmin = await authService.createUser(
      superAdminUsername, superAdminPassword, superAdminUsername,
      UserRole.SUPER_ADMINISTRATOR,
    );
    const admin = await authService.createUser(
      adminUsername, adminPassword, adminUsername,
      UserRole.ADMINISTRATOR,
    );

    res.status(201).json({ success: true, data: { superAdmin, admin } });
  } catch (err) { next(err); }
});

router.post('/reset-super-admin', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organization, code, newUsername, newPassword } = req.body;
    const sourceIp = req.ip || req.socket.remoteAddress;
    const org = organization as CommissioningOrg;

    if (!Object.values(CommissioningOrg).includes(org)) {
      throw new ValidationError('Invalid organization. Must be SWIMEX or BSC_INDUSTRIES');
    }

    const user = await authService.resetSuperAdmin(org, code, newUsername, newPassword, sourceIp);
    res.json({ success: true, data: { user } });
  } catch (err) { next(err); }
});

export default router;
