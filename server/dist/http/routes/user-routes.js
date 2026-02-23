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
const router = (0, express_1.Router)();
router.get('/', middleware_1.authenticate, middleware_1.requireAdmin, (req, res, next) => {
    try {
        const role = req.query.role;
        const users = authService.listUsers(role);
        res.json({ success: true, data: users });
    }
    catch (err) {
        next(err);
    }
});
router.get('/:id', middleware_1.authenticate, middleware_1.requireAdmin, (req, res, next) => {
    try {
        const user = authService.getUserById(req.params.id);
        if (!user)
            return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } });
        res.json({ success: true, data: user });
    }
    catch (err) {
        next(err);
    }
});
router.post('/', middleware_1.authenticate, middleware_1.requireAdmin, async (req, res, next) => {
    try {
        const { username, password, displayName, role, email } = req.body;
        const user = await authService.createUser(username, password, displayName, role, email, req.user.userId);
        res.status(201).json({ success: true, data: user });
    }
    catch (err) {
        next(err);
    }
});
router.put('/:id/role', middleware_1.authenticate, middleware_1.requireAdmin, async (req, res, next) => {
    try {
        const user = await authService.updateUserRole(req.params.id, req.body.role, req.user.userId);
        res.json({ success: true, data: user });
    }
    catch (err) {
        next(err);
    }
});
router.put('/:id/password', middleware_1.authenticate, middleware_1.requireAdmin, async (req, res, next) => {
    try {
        await authService.updatePassword(req.params.id, req.body.newPassword, req.user.userId);
        res.json({ success: true });
    }
    catch (err) {
        next(err);
    }
});
router.put('/:id/disable', middleware_1.authenticate, middleware_1.requireAdmin, (req, res, next) => {
    try {
        authService.disableUser(req.params.id, req.user.userId);
        res.json({ success: true });
    }
    catch (err) {
        next(err);
    }
});
router.put('/:id/enable', middleware_1.authenticate, middleware_1.requireAdmin, (req, res, next) => {
    try {
        authService.enableUser(req.params.id, req.user.userId);
        res.json({ success: true });
    }
    catch (err) {
        next(err);
    }
});
router.delete('/:id', middleware_1.authenticate, middleware_1.requireAdmin, (req, res, next) => {
    try {
        authService.deleteUser(req.params.id, req.user.userId);
        res.json({ success: true });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
//# sourceMappingURL=user-routes.js.map