import { Request, Response, NextFunction } from 'express';
import { TokenPayload } from './auth-service';
import { UserRole } from '../shared/models';
declare global {
    namespace Express {
        interface Request {
            user?: TokenPayload;
            macAddress?: string;
            isRegisteredDevice?: boolean;
        }
    }
}
export declare function authenticate(req: Request, _res: Response, next: NextFunction): void;
export declare function optionalAuth(req: Request, _res: Response, next: NextFunction): void;
export declare function requireRole(...roles: UserRole[]): (req: Request, _res: Response, next: NextFunction) => void;
export declare function requireAdmin(req: Request, _res: Response, next: NextFunction): void;
export declare function requireSuperAdmin(req: Request, _res: Response, next: NextFunction): void;
export declare function checkDeviceRegistration(req: Request, _res: Response, next: NextFunction): void;
export declare function requireRegisteredDevice(req: Request, _res: Response, next: NextFunction): void;
//# sourceMappingURL=middleware.d.ts.map