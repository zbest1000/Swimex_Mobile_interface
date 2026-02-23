"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = authenticate;
exports.optionalAuth = optionalAuth;
exports.requireRole = requireRole;
exports.requireAdmin = requireAdmin;
exports.requireSuperAdmin = requireSuperAdmin;
exports.checkDeviceRegistration = checkDeviceRegistration;
exports.requireRegisteredDevice = requireRegisteredDevice;
const auth_service_1 = require("./auth-service");
const models_1 = require("../shared/models");
const errors_1 = require("../utils/errors");
const connection_1 = require("../database/connection");
function authenticate(req, _res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next(new errors_1.AuthError());
    }
    const token = authHeader.slice(7);
    try {
        req.user = (0, auth_service_1.verifyToken)(token);
        // Check if session is still valid (not revoked)
        const db = (0, connection_1.getDb)();
        const session = db.prepare('SELECT * FROM sessions WHERE token = ? AND is_revoked = 0 AND expires_at > datetime("now")').get(token);
        if (!session) {
            return next(new errors_1.AuthError('Session expired or revoked'));
        }
        next();
    }
    catch (err) {
        next(err);
    }
}
function optionalAuth(req, _res, next) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.slice(7);
        try {
            req.user = (0, auth_service_1.verifyToken)(token);
        }
        catch {
            // Ignore invalid tokens for optional auth
        }
    }
    next();
}
function requireRole(...roles) {
    return (req, _res, next) => {
        if (!req.user)
            return next(new errors_1.AuthError());
        if (!roles.includes(req.user.role)) {
            return next(new errors_1.ForbiddenError());
        }
        next();
    };
}
function requireAdmin(req, _res, next) {
    if (!req.user)
        return next(new errors_1.AuthError());
    const adminRoles = [models_1.UserRole.SUPER_ADMINISTRATOR, models_1.UserRole.ADMINISTRATOR];
    if (!adminRoles.includes(req.user.role)) {
        return next(new errors_1.ForbiddenError());
    }
    next();
}
function requireSuperAdmin(req, _res, next) {
    if (!req.user)
        return next(new errors_1.AuthError());
    if (req.user.role !== models_1.UserRole.SUPER_ADMINISTRATOR) {
        return next(new errors_1.ForbiddenError());
    }
    next();
}
function checkDeviceRegistration(req, _res, next) {
    const mac = req.headers['x-device-mac'];
    req.macAddress = mac;
    if (mac) {
        const db = (0, connection_1.getDb)();
        const device = db.prepare('SELECT is_registered FROM registered_devices WHERE mac_address = ? AND is_registered = 1').get(mac);
        req.isRegisteredDevice = !!device;
        // Update last seen
        db.prepare('UPDATE registered_devices SET last_seen_at = datetime("now") WHERE mac_address = ?').run(mac);
    }
    else {
        req.isRegisteredDevice = false;
    }
    next();
}
function requireRegisteredDevice(req, _res, next) {
    // Admins bypass device registration check
    if (req.user && [models_1.UserRole.SUPER_ADMINISTRATOR, models_1.UserRole.ADMINISTRATOR].includes(req.user.role)) {
        return next();
    }
    if (!req.isRegisteredDevice) {
        return next(new errors_1.DeviceNotRegisteredError());
    }
    next();
}
//# sourceMappingURL=middleware.js.map