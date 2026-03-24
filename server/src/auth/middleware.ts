import { Request, Response, NextFunction } from 'express';
import { verifyToken, TokenPayload } from './auth-service';
import { UserRole } from '../shared/models';
import { AuthError, ForbiddenError, DeviceNotRegisteredError } from '../utils/errors';
import { getDb } from '../database/connection';

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
      macAddress?: string;
      isRegisteredDevice?: boolean;
    }
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AuthError());
  }

  const token = authHeader.slice(7);
  try {
    req.user = verifyToken(token);

    const db = getDb();
    const sessionId = req.user.sessionId;
    if (!sessionId) {
      return next(new AuthError('Session expired or revoked'));
    }

    const session = db.prepare(
      "SELECT * FROM sessions WHERE token = ? AND is_revoked = 0 AND expires_at > datetime('now')"
    ).get(sessionId) as Record<string, unknown> | undefined;

    if (!session) {
      return next(new AuthError('Session expired or revoked'));
    }

    next();
  } catch (err) {
    next(err);
  }
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    try {
      req.user = verifyToken(token);
    } catch {
      // Ignore invalid tokens for optional auth
    }
  }
  next();
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) return next(new AuthError());
    if (!roles.includes(req.user.role as UserRole)) {
      return next(new ForbiddenError());
    }
    next();
  };
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) return next(new AuthError());
  const adminRoles = [UserRole.SUPER_ADMINISTRATOR, UserRole.ADMINISTRATOR];
  if (!adminRoles.includes(req.user.role as UserRole)) {
    return next(new ForbiddenError());
  }
  next();
}

export function requireSuperAdmin(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) return next(new AuthError());
  if (req.user.role !== UserRole.SUPER_ADMINISTRATOR) {
    return next(new ForbiddenError());
  }
  next();
}

export function checkDeviceRegistration(req: Request, _res: Response, next: NextFunction): void {
  const mac = req.headers['x-device-mac'] as string | undefined;
  req.macAddress = mac;

  if (mac) {
    const db = getDb();
    const device = db.prepare('SELECT is_registered FROM registered_devices WHERE mac_address = ? AND is_registered = 1').get(mac);
    req.isRegisteredDevice = !!device;

    // Update last seen
    db.prepare("UPDATE registered_devices SET last_seen_at = datetime('now') WHERE mac_address = ?").run(mac);
  } else {
    req.isRegisteredDevice = false;
  }

  next();
}

export function requireRegisteredDevice(req: Request, _res: Response, next: NextFunction): void {
  // Admins bypass device registration check
  if (req.user && [UserRole.SUPER_ADMINISTRATOR, UserRole.ADMINISTRATOR].includes(req.user.role as UserRole)) {
    return next();
  }
  if (!req.isRegisteredDevice) {
    return next(new DeviceNotRegisteredError());
  }
  next();
}
