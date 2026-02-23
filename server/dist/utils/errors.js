"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeviceNotRegisteredError = exports.RateLimitError = exports.ValidationError = exports.NotFoundError = exports.ForbiddenError = exports.AuthError = exports.AppError = void 0;
const protocols_1 = require("../shared/protocols");
class AppError extends Error {
    code;
    statusCode;
    constructor(code, message, statusCode = 500) {
        super(message);
        this.code = code;
        this.statusCode = statusCode;
        this.name = 'AppError';
    }
}
exports.AppError = AppError;
class AuthError extends AppError {
    constructor(message = 'Authentication required') {
        super(protocols_1.API_ERROR_CODES.AUTH_REQUIRED, message, 401);
        this.name = 'AuthError';
    }
}
exports.AuthError = AuthError;
class ForbiddenError extends AppError {
    constructor(message = 'Insufficient permissions') {
        super(protocols_1.API_ERROR_CODES.INSUFFICIENT_PERMISSIONS, message, 403);
        this.name = 'ForbiddenError';
    }
}
exports.ForbiddenError = ForbiddenError;
class NotFoundError extends AppError {
    constructor(message = 'Resource not found') {
        super(protocols_1.API_ERROR_CODES.RESOURCE_NOT_FOUND, message, 404);
        this.name = 'NotFoundError';
    }
}
exports.NotFoundError = NotFoundError;
class ValidationError extends AppError {
    constructor(message) {
        super(protocols_1.API_ERROR_CODES.VALIDATION_ERROR, message, 400);
        this.name = 'ValidationError';
    }
}
exports.ValidationError = ValidationError;
class RateLimitError extends AppError {
    constructor(message = 'Too many attempts, please try again later') {
        super(protocols_1.API_ERROR_CODES.RATE_LIMITED, message, 429);
        this.name = 'RateLimitError';
    }
}
exports.RateLimitError = RateLimitError;
class DeviceNotRegisteredError extends AppError {
    constructor() {
        super(protocols_1.API_ERROR_CODES.VIEW_ONLY, 'Device not registered — view-only access', 403);
        this.name = 'DeviceNotRegisteredError';
    }
}
exports.DeviceNotRegisteredError = DeviceNotRegisteredError;
//# sourceMappingURL=errors.js.map