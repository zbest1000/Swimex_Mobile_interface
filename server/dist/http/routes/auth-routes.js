"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authService = __importStar(require("../../auth/auth-service"));
const middleware_1 = require("../../auth/middleware");
const models_1 = require("../../shared/models");
const errors_1 = require("../../utils/errors");
const router = (0, express_1.Router)();
router.post('/register', async (req, res, next) => {
    try {
        const { username, password, displayName, email } = req.body;
        const user = await authService.createUser(username, password, displayName, models_1.UserRole.USER, email);
        const { token } = await authService.login(username, password);
        res.status(201).json({ success: true, data: { user, token } });
    }
    catch (err) {
        next(err);
    }
});
router.post('/login', async (req, res, next) => {
    try {
        const { username, password } = req.body;
        const sourceIp = req.ip || req.socket.remoteAddress;
        const result = await authService.login(username, password, sourceIp);
        res.json({ success: true, data: result });
    }
    catch (err) {
        next(err);
    }
});
router.post('/logout', middleware_1.authenticate, (req, res, next) => {
    try {
        const token = req.headers.authorization?.slice(7);
        if (token) {
            const db = require('../../database/connection').getDb();
            db.prepare('UPDATE sessions SET is_revoked = 1 WHERE token = ?').run(token);
        }
        res.json({ success: true });
    }
    catch (err) {
        next(err);
    }
});
router.get('/me', middleware_1.authenticate, (req, res, next) => {
    try {
        const user = authService.getUserById(req.user.userId);
        const prefs = authService.getUserPreferences(req.user.userId);
        res.json({ success: true, data: { user, preferences: prefs } });
    }
    catch (err) {
        next(err);
    }
});
router.put('/me/preferences', middleware_1.authenticate, (req, res, next) => {
    try {
        authService.updateUserPreferences(req.user.userId, req.body);
        const prefs = authService.getUserPreferences(req.user.userId);
        res.json({ success: true, data: prefs });
    }
    catch (err) {
        next(err);
    }
});
router.put('/me/password', middleware_1.authenticate, async (req, res, next) => {
    try {
        const { newPassword } = req.body;
        await authService.updatePassword(req.user.userId, newPassword);
        res.json({ success: true });
    }
    catch (err) {
        next(err);
    }
});
router.get('/commissioned', (_req, res) => {
    res.json({ success: true, data: { commissioned: authService.isCommissioned() } });
});
router.post('/commission', async (req, res, next) => {
    try {
        if (authService.isCommissioned()) {
            throw new errors_1.ValidationError('Server is already commissioned');
        }
        const { swimexCode, bscCode, superAdminUsername, superAdminPassword, adminUsername, adminPassword } = req.body;
        if (!swimexCode || !bscCode)
            throw new errors_1.ValidationError('Both commissioning codes are required');
        await authService.setCommissioningCode(models_1.CommissioningOrg.SWIMEX, swimexCode);
        await authService.setCommissioningCode(models_1.CommissioningOrg.BSC_INDUSTRIES, bscCode);
        const superAdmin = await authService.createUser(superAdminUsername, superAdminPassword, superAdminUsername, models_1.UserRole.SUPER_ADMINISTRATOR);
        const admin = await authService.createUser(adminUsername, adminPassword, adminUsername, models_1.UserRole.ADMINISTRATOR);
        res.status(201).json({ success: true, data: { superAdmin, admin } });
    }
    catch (err) {
        next(err);
    }
});
router.post('/reset-super-admin', async (req, res, next) => {
    try {
        const { organization, code, newUsername, newPassword } = req.body;
        const sourceIp = req.ip || req.socket.remoteAddress;
        const org = organization;
        if (!Object.values(models_1.CommissioningOrg).includes(org)) {
            throw new errors_1.ValidationError('Invalid organization. Must be SWIMEX or BSC_INDUSTRIES');
        }
        const user = await authService.resetSuperAdmin(org, code, newUsername, newPassword, sourceIp);
        res.json({ success: true, data: { user } });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
//# sourceMappingURL=auth-routes.js.map