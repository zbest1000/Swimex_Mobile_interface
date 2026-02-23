export declare class AppError extends Error {
    readonly code: string;
    readonly statusCode: number;
    constructor(code: string, message: string, statusCode?: number);
}
export declare class AuthError extends AppError {
    constructor(message?: string);
}
export declare class ForbiddenError extends AppError {
    constructor(message?: string);
}
export declare class NotFoundError extends AppError {
    constructor(message?: string);
}
export declare class ValidationError extends AppError {
    constructor(message: string);
}
export declare class RateLimitError extends AppError {
    constructor(message?: string);
}
export declare class DeviceNotRegisteredError extends AppError {
    constructor();
}
//# sourceMappingURL=errors.d.ts.map