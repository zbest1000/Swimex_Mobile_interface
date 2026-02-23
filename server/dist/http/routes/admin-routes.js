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
const middleware_1 = require("../../auth/middleware");
const deviceService = __importStar(require("../../admin/device-service"));
const commConfigService = __importStar(require("../../admin/comm-config-service"));
const tagMappingService = __importStar(require("../../admin/tag-mapping-service"));
const featureFlagService = __importStar(require("../../admin/feature-flag-service"));
const layoutService = __importStar(require("../../admin/layout-service"));
const audit_1 = require("../../auth/audit");
const models_1 = require("../../shared/models");
const ws_handler_1 = require("../../websocket/ws-handler");
const mqtt_broker_1 = require("../../mqtt/mqtt-broker");
const modbus_server_1 = require("../../modbus/modbus-server");
const modbus_client_1 = require("../../modbus/modbus-client");
const router = (0, express_1.Router)();
// --- System dashboard ---
router.get('/dashboard', middleware_1.authenticate, middleware_1.requireAdmin, (_req, res) => {
    res.json({
        success: true,
        data: {
            wsClients: ws_handler_1.wsHandler.getConnectedCount(),
            mqttClients: mqtt_broker_1.mqttBroker.getConnectedClients(),
            mqttRunning: mqtt_broker_1.mqttBroker.isRunning(),
            modbusServerRunning: modbus_server_1.modbusServer.isRunning(),
            modbusClientConnected: modbus_client_1.modbusClient.isConnected(),
        },
    });
});
// --- Device management ---
router.get('/devices', middleware_1.authenticate, middleware_1.requireAdmin, (_req, res) => {
    res.json({ success: true, data: deviceService.listDevices() });
});
router.post('/devices', middleware_1.authenticate, middleware_1.requireAdmin, (req, res, next) => {
    try {
        const { macAddress, deviceName, deviceType } = req.body;
        const device = deviceService.registerDevice(macAddress, deviceName, deviceType, req.user.userId);
        res.status(201).json({ success: true, data: device });
    }
    catch (err) {
        next(err);
    }
});
router.put('/devices/:id/revoke', middleware_1.authenticate, middleware_1.requireAdmin, (req, res, next) => {
    try {
        deviceService.revokeDevice(req.params.id, req.user.userId);
        res.json({ success: true });
    }
    catch (err) {
        next(err);
    }
});
router.delete('/devices/:id', middleware_1.authenticate, middleware_1.requireAdmin, (req, res, next) => {
    try {
        deviceService.deleteDevice(req.params.id, req.user.userId);
        res.json({ success: true });
    }
    catch (err) {
        next(err);
    }
});
// --- Communication config ---
router.get('/communication', middleware_1.authenticate, (0, middleware_1.requireRole)(models_1.UserRole.SUPER_ADMINISTRATOR, models_1.UserRole.ADMINISTRATOR, models_1.UserRole.MAINTENANCE), (req, res) => {
    const protocol = req.query.protocol;
    res.json({ success: true, data: commConfigService.listConfigs(protocol) });
});
router.get('/communication/:id', middleware_1.authenticate, (0, middleware_1.requireRole)(models_1.UserRole.SUPER_ADMINISTRATOR, models_1.UserRole.ADMINISTRATOR, models_1.UserRole.MAINTENANCE), (req, res, next) => {
    try {
        res.json({ success: true, data: commConfigService.getConfig(req.params.id) });
    }
    catch (err) {
        next(err);
    }
});
router.post('/communication', middleware_1.authenticate, (0, middleware_1.requireRole)(models_1.UserRole.SUPER_ADMINISTRATOR, models_1.UserRole.ADMINISTRATOR, models_1.UserRole.MAINTENANCE), (req, res, next) => {
    try {
        const { protocol, name, config: configData } = req.body;
        const cfg = commConfigService.createConfig(protocol, name, configData, req.user.userId);
        res.status(201).json({ success: true, data: cfg });
    }
    catch (err) {
        next(err);
    }
});
router.put('/communication/:id', middleware_1.authenticate, (0, middleware_1.requireRole)(models_1.UserRole.SUPER_ADMINISTRATOR, models_1.UserRole.ADMINISTRATOR, models_1.UserRole.MAINTENANCE), (req, res, next) => {
    try {
        const cfg = commConfigService.updateConfig(req.params.id, req.body, req.user.userId);
        res.json({ success: true, data: cfg });
    }
    catch (err) {
        next(err);
    }
});
router.delete('/communication/:id', middleware_1.authenticate, middleware_1.requireAdmin, (req, res, next) => {
    try {
        commConfigService.deleteConfig(req.params.id, req.user.userId);
        res.json({ success: true });
    }
    catch (err) {
        next(err);
    }
});
// --- Tag mappings ---
router.get('/tags', middleware_1.authenticate, (0, middleware_1.requireRole)(models_1.UserRole.SUPER_ADMINISTRATOR, models_1.UserRole.ADMINISTRATOR, models_1.UserRole.MAINTENANCE), (_req, res) => {
    res.json({ success: true, data: tagMappingService.listMappings() });
});
router.post('/tags', middleware_1.authenticate, middleware_1.requireAdmin, (req, res, next) => {
    try {
        const { objectId, objectName, tagAddress, protocol, dataType, accessMode, scaleFactor, offset } = req.body;
        const mapping = tagMappingService.createMapping(objectId, objectName, tagAddress, protocol, dataType, accessMode, scaleFactor ?? 1.0, offset ?? 0, req.user.userId);
        res.status(201).json({ success: true, data: mapping });
    }
    catch (err) {
        next(err);
    }
});
router.put('/tags/:id', middleware_1.authenticate, middleware_1.requireAdmin, (req, res, next) => {
    try {
        const mapping = tagMappingService.updateMapping(req.params.id, req.body, req.user.userId);
        res.json({ success: true, data: mapping });
    }
    catch (err) {
        next(err);
    }
});
router.delete('/tags/:id', middleware_1.authenticate, middleware_1.requireAdmin, (req, res, next) => {
    try {
        tagMappingService.deleteMapping(req.params.id, req.user.userId);
        res.json({ success: true });
    }
    catch (err) {
        next(err);
    }
});
// --- Feature flags (Super Admin only) ---
router.get('/feature-flags', middleware_1.authenticate, middleware_1.requireSuperAdmin, (_req, res) => {
    res.json({ success: true, data: featureFlagService.listFlags() });
});
router.put('/feature-flags/:key', middleware_1.authenticate, middleware_1.requireSuperAdmin, (req, res, next) => {
    try {
        const { enabled, visible } = req.body;
        const flag = featureFlagService.setFlag(req.params.key, enabled, visible, req.user.userId);
        res.json({ success: true, data: flag });
    }
    catch (err) {
        next(err);
    }
});
// --- UI Layouts ---
router.get('/layouts', middleware_1.authenticate, (0, middleware_1.requireRole)(models_1.UserRole.SUPER_ADMINISTRATOR, models_1.UserRole.ADMINISTRATOR, models_1.UserRole.MAINTENANCE), (_req, res) => {
    res.json({ success: true, data: layoutService.listLayouts() });
});
router.get('/layouts/active', (_req, res) => {
    const layout = layoutService.getActiveLayout();
    res.json({ success: true, data: layout });
});
router.get('/layouts/:id', middleware_1.authenticate, (0, middleware_1.requireRole)(models_1.UserRole.SUPER_ADMINISTRATOR, models_1.UserRole.ADMINISTRATOR, models_1.UserRole.MAINTENANCE), (req, res, next) => {
    try {
        res.json({ success: true, data: layoutService.getLayout(req.params.id) });
    }
    catch (err) {
        next(err);
    }
});
router.post('/layouts', middleware_1.authenticate, (0, middleware_1.requireRole)(models_1.UserRole.SUPER_ADMINISTRATOR, models_1.UserRole.ADMINISTRATOR, models_1.UserRole.MAINTENANCE), (req, res, next) => {
    try {
        const { name, templateId, widgets } = req.body;
        const layout = layoutService.createLayout(name, templateId, widgets ?? [], req.user.userId);
        res.status(201).json({ success: true, data: layout });
    }
    catch (err) {
        next(err);
    }
});
router.put('/layouts/:id', middleware_1.authenticate, (0, middleware_1.requireRole)(models_1.UserRole.SUPER_ADMINISTRATOR, models_1.UserRole.ADMINISTRATOR, models_1.UserRole.MAINTENANCE), (req, res, next) => {
    try {
        const layout = layoutService.updateLayout(req.params.id, req.body, req.user.userId);
        res.json({ success: true, data: layout });
    }
    catch (err) {
        next(err);
    }
});
router.put('/layouts/:id/publish', middleware_1.authenticate, middleware_1.requireAdmin, (req, res, next) => {
    try {
        const layout = layoutService.publishLayout(req.params.id, req.user.userId);
        res.json({ success: true, data: layout });
    }
    catch (err) {
        next(err);
    }
});
router.delete('/layouts/:id', middleware_1.authenticate, middleware_1.requireAdmin, (req, res, next) => {
    try {
        layoutService.deleteLayout(req.params.id, req.user.userId);
        res.json({ success: true });
    }
    catch (err) {
        next(err);
    }
});
// --- Audit log ---
router.get('/audit-log', middleware_1.authenticate, middleware_1.requireAdmin, (req, res) => {
    const { limit, offset, action, actorId, targetType } = req.query;
    const result = (0, audit_1.getAuditLogs)({
        limit: limit ? parseInt(limit) : undefined,
        offset: offset ? parseInt(offset) : undefined,
        action: action,
        actorId: actorId,
        targetType: targetType,
    });
    res.json({ success: true, data: result.entries, meta: { total: result.total } });
});
exports.default = router;
//# sourceMappingURL=admin-routes.js.map