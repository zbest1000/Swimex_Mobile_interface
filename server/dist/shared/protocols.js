"use strict";
// SwimEx EDGE — Protocol Message Definitions
Object.defineProperty(exports, "__esModule", { value: true });
exports.API_ERROR_CODES = exports.DEFAULT_TOPICS = void 0;
const DEFAULT_TOPICS = (poolId = 'default') => ({
    commandPrefix: `swimex/${poolId}/command`,
    statusPrefix: `swimex/${poolId}/status`,
    keepAlive: `swimex/${poolId}/keepalive`,
});
exports.DEFAULT_TOPICS = DEFAULT_TOPICS;
exports.API_ERROR_CODES = {
    AUTH_REQUIRED: 'AUTH_REQUIRED',
    INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
    INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
    TOKEN_EXPIRED: 'TOKEN_EXPIRED',
    DEVICE_NOT_REGISTERED: 'DEVICE_NOT_REGISTERED',
    VIEW_ONLY: 'VIEW_ONLY',
    RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    RATE_LIMITED: 'RATE_LIMITED',
    COMMISSIONING_CODE_INVALID: 'COMMISSIONING_CODE_INVALID',
    COMMISSIONING_CODE_LOCKOUT: 'COMMISSIONING_CODE_LOCKOUT',
    SERVER_ERROR: 'SERVER_ERROR',
    PLC_DISCONNECTED: 'PLC_DISCONNECTED',
    SAFETY_STOP_ACTIVE: 'SAFETY_STOP_ACTIVE',
};
//# sourceMappingURL=protocols.js.map