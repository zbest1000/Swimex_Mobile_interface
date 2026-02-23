import { UserRole, CommissioningOrg } from '../shared/models';
export interface TokenPayload {
    userId: string;
    username: string;
    role: UserRole;
    iat?: number;
    exp?: number;
}
export interface UserDTO {
    id: string;
    username: string;
    displayName: string;
    email: string | null;
    role: UserRole;
    isActive: boolean;
    createdAt: string;
    lastLoginAt: string | null;
}
export declare function hashPassword(password: string): Promise<string>;
export declare function verifyPassword(hash: string, password: string): Promise<boolean>;
export declare function generateToken(payload: TokenPayload): string;
export declare function verifyToken(token: string): TokenPayload;
export declare function createUser(username: string, password: string, displayName: string, role?: UserRole, email?: string, createdBy?: string): Promise<UserDTO>;
export declare function login(username: string, password: string, sourceIp?: string): Promise<{
    user: UserDTO;
    token: string;
}>;
export declare function getUserById(id: string): UserDTO | null;
export declare function listUsers(role?: UserRole): UserDTO[];
export declare function updateUserRole(userId: string, newRole: UserRole, actorId: string): Promise<UserDTO>;
export declare function updatePassword(userId: string, newPassword: string, actorId?: string): Promise<void>;
export declare function disableUser(userId: string, actorId: string): void;
export declare function enableUser(userId: string, actorId: string): void;
export declare function deleteUser(userId: string, actorId: string): void;
export declare function setCommissioningCode(org: CommissioningOrg, code: string): Promise<void>;
export declare function resetSuperAdmin(org: CommissioningOrg, code: string, newUsername: string, newPassword: string, sourceIp?: string): Promise<UserDTO>;
export declare function isCommissioned(): boolean;
export declare function getUserPreferences(userId: string): Record<string, unknown> | null;
export declare function updateUserPreferences(userId: string, prefs: Partial<{
    theme: string;
    defaultSpeed: number;
    fitnessLevel: string;
    activeTemplate: string;
}>): void;
//# sourceMappingURL=auth-service.d.ts.map