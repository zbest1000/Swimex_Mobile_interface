import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { authenticate, requireAdmin, requireSuperAdmin, requireRole } from '../../auth/middleware';
import * as deviceService from '../../admin/device-service';
import * as commConfigService from '../../admin/comm-config-service';
import * as tagMappingService from '../../admin/tag-mapping-service';
import * as featureFlagService from '../../admin/feature-flag-service';
import * as layoutService from '../../admin/layout-service';
import * as wifiService from '../../admin/wifi-service';
import * as configService from '../../admin/config-service';
import * as brandingService from '../../admin/branding-service';
import { getAuditLogs } from '../../auth/audit';
import { UserRole, Protocol } from '../../shared/models';
import { wsHandler } from '../../websocket/ws-handler';
import { mqttBroker } from '../../mqtt/mqtt-broker';
import { modbusServer } from '../../modbus/modbus-server';
import { modbusClient } from '../../modbus/modbus-client';

const logoUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

const router = Router();

// --- System dashboard ---
router.get('/dashboard', authenticate, requireAdmin, (_req: Request, res: Response) => {
  const { tagDatabase } = require('../../tags/tag-database');
  const { workoutEngine } = require('../../workouts/workout-engine');
  res.json({
    success: true,
    data: {
      wsClients: wsHandler.getConnectedCount(),
      wsClientList: wsHandler.getClientList(),
      mqttConnected: mqttBroker.isConnected(),
      modbusServerRunning: modbusServer.isRunning(),
      modbusServerConnections: modbusServer.getConnectionCount(),
      modbusClientConnected: modbusClient.isConnected(),
      modbusClientStats: modbusClient.getStats(),
      tagStats: tagDatabase.getStats(),
      activeWorkout: workoutEngine.getActiveWorkout(),
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
    },
  });
});

// --- Device management ---
router.get('/devices', authenticate, requireAdmin, (_req: Request, res: Response) => {
  res.json({ success: true, data: deviceService.listDevices() });
});

router.post('/devices', authenticate, requireAdmin, (req: Request, res: Response, next: NextFunction) => {
  try {
    const { macAddress, deviceName, deviceType } = req.body;
    const device = deviceService.registerDevice(macAddress, deviceName, deviceType, req.user!.userId);
    res.status(201).json({ success: true, data: device });
  } catch (err) { next(err); }
});

router.put('/devices/:id/revoke', authenticate, requireAdmin, (req: Request, res: Response, next: NextFunction) => {
  try {
    deviceService.revokeDevice(req.params.id, req.user!.userId);
    res.json({ success: true });
  } catch (err) { next(err); }
});

router.delete('/devices/:id', authenticate, requireAdmin, (req: Request, res: Response, next: NextFunction) => {
  try {
    deviceService.deleteDevice(req.params.id, req.user!.userId);
    res.json({ success: true });
  } catch (err) { next(err); }
});

// --- Communication config ---
router.get('/communication', authenticate, requireRole(UserRole.SUPER_ADMINISTRATOR, UserRole.ADMINISTRATOR, UserRole.MAINTENANCE), (req: Request, res: Response) => {
  const protocol = req.query.protocol as Protocol | undefined;
  res.json({ success: true, data: commConfigService.listConfigs(protocol) });
});

router.get('/communication/:id', authenticate, requireRole(UserRole.SUPER_ADMINISTRATOR, UserRole.ADMINISTRATOR, UserRole.MAINTENANCE), (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ success: true, data: commConfigService.getConfig(req.params.id) });
  } catch (err) { next(err); }
});

router.post('/communication', authenticate, requireRole(UserRole.SUPER_ADMINISTRATOR, UserRole.ADMINISTRATOR, UserRole.MAINTENANCE), (req: Request, res: Response, next: NextFunction) => {
  try {
    const { protocol, name, config: configData } = req.body;
    const cfg = commConfigService.createConfig(protocol, name, configData, req.user!.userId);
    res.status(201).json({ success: true, data: cfg });
  } catch (err) { next(err); }
});

router.put('/communication/:id', authenticate, requireRole(UserRole.SUPER_ADMINISTRATOR, UserRole.ADMINISTRATOR, UserRole.MAINTENANCE), (req: Request, res: Response, next: NextFunction) => {
  try {
    const cfg = commConfigService.updateConfig(req.params.id, req.body, req.user!.userId);
    res.json({ success: true, data: cfg });
  } catch (err) { next(err); }
});

router.delete('/communication/:id', authenticate, requireAdmin, (req: Request, res: Response, next: NextFunction) => {
  try {
    commConfigService.deleteConfig(req.params.id, req.user!.userId);
    res.json({ success: true });
  } catch (err) { next(err); }
});

// --- Tag mappings ---
router.get('/tags', authenticate, requireRole(UserRole.SUPER_ADMINISTRATOR, UserRole.ADMINISTRATOR, UserRole.MAINTENANCE), (_req: Request, res: Response) => {
  res.json({ success: true, data: tagMappingService.listMappings() });
});

router.post('/tags', authenticate, requireAdmin, (req: Request, res: Response, next: NextFunction) => {
  try {
    const { objectId, objectName, tagAddress, protocol, dataType, accessMode, scaleFactor, offset } = req.body;
    const mapping = tagMappingService.createMapping(objectId, objectName, tagAddress, protocol, dataType, accessMode, scaleFactor ?? 1.0, offset ?? 0, req.user!.userId);
    res.status(201).json({ success: true, data: mapping });
  } catch (err) { next(err); }
});

router.put('/tags/:id', authenticate, requireAdmin, (req: Request, res: Response, next: NextFunction) => {
  try {
    const mapping = tagMappingService.updateMapping(req.params.id, req.body, req.user!.userId);
    res.json({ success: true, data: mapping });
  } catch (err) { next(err); }
});

router.delete('/tags/:id', authenticate, requireAdmin, (req: Request, res: Response, next: NextFunction) => {
  try {
    tagMappingService.deleteMapping(req.params.id, req.user!.userId);
    res.json({ success: true });
  } catch (err) { next(err); }
});

// --- Feature flags (Super Admin only) ---
router.get('/feature-flags', authenticate, requireSuperAdmin, (_req: Request, res: Response) => {
  res.json({ success: true, data: featureFlagService.listFlags() });
});

router.put('/feature-flags/:key', authenticate, requireSuperAdmin, (req: Request, res: Response, next: NextFunction) => {
  try {
    const { enabled, visible } = req.body;
    const flag = featureFlagService.setFlag(req.params.key, enabled, visible, req.user!.userId);
    res.json({ success: true, data: flag });
  } catch (err) { next(err); }
});

// --- UI Layouts ---
router.get('/layouts', authenticate, requireRole(UserRole.SUPER_ADMINISTRATOR, UserRole.ADMINISTRATOR, UserRole.MAINTENANCE), (_req: Request, res: Response) => {
  res.json({ success: true, data: layoutService.listLayouts() });
});

router.get('/layouts/active', (_req: Request, res: Response) => {
  const layout = layoutService.getActiveLayout();
  res.json({ success: true, data: layout });
});

router.get('/layouts/:id', authenticate, requireRole(UserRole.SUPER_ADMINISTRATOR, UserRole.ADMINISTRATOR, UserRole.MAINTENANCE), (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ success: true, data: layoutService.getLayout(req.params.id) });
  } catch (err) { next(err); }
});

router.post('/layouts', authenticate, requireRole(UserRole.SUPER_ADMINISTRATOR, UserRole.ADMINISTRATOR, UserRole.MAINTENANCE), (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, templateId, widgets } = req.body;
    const layout = layoutService.createLayout(name, templateId, widgets ?? [], req.user!.userId);
    res.status(201).json({ success: true, data: layout });
  } catch (err) { next(err); }
});

router.put('/layouts/:id', authenticate, requireRole(UserRole.SUPER_ADMINISTRATOR, UserRole.ADMINISTRATOR, UserRole.MAINTENANCE), (req: Request, res: Response, next: NextFunction) => {
  try {
    const layout = layoutService.updateLayout(req.params.id, req.body, req.user!.userId);
    res.json({ success: true, data: layout });
  } catch (err) { next(err); }
});

router.put('/layouts/:id/publish', authenticate, requireAdmin, (req: Request, res: Response, next: NextFunction) => {
  try {
    const layout = layoutService.publishLayout(req.params.id, req.user!.userId);
    res.json({ success: true, data: layout });
  } catch (err) { next(err); }
});

router.delete('/layouts/:id', authenticate, requireAdmin, (req: Request, res: Response, next: NextFunction) => {
  try {
    layoutService.deleteLayout(req.params.id, req.user!.userId);
    res.json({ success: true });
  } catch (err) { next(err); }
});

// --- Device bulk import/export ---
router.get('/devices/export', authenticate, requireAdmin, (_req: Request, res: Response) => {
  const devices = deviceService.listDevices();
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="devices-${new Date().toISOString().slice(0, 10)}.json"`);
  res.json({ success: true, data: devices });
});

router.post('/devices/import', authenticate, requireAdmin, (req: Request, res: Response, next: NextFunction) => {
  try {
    const { devices } = req.body;
    if (!Array.isArray(devices)) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'devices must be an array' } });
    }
    const results = { imported: 0, skipped: 0, errors: [] as string[] };
    for (const d of devices) {
      try {
        deviceService.registerDevice(d.macAddress, d.deviceName ?? 'Imported Device', d.deviceType ?? 'TABLET', req.user!.userId);
        results.imported++;
      } catch (err: any) {
        results.errors.push(`${d.macAddress}: ${err.message}`);
        results.skipped++;
      }
    }
    res.json({ success: true, data: results });
  } catch (err) { next(err); }
});

// --- WiFi AP Management ---
router.get('/wifi', authenticate, requireAdmin, (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      config: wifiService.getWifiConfig(),
      status: wifiService.getWifiStatus(),
    },
  });
});

router.put('/wifi', authenticate, requireAdmin, (req: Request, res: Response, next: NextFunction) => {
  try {
    const cfg = wifiService.updateWifiConfig(req.body, req.user!.userId);
    res.json({ success: true, data: cfg });
  } catch (err) { next(err); }
});

router.post('/wifi/start', authenticate, requireAdmin, (req: Request, res: Response) => {
  const result = wifiService.applyWifiConfig(req.user!.userId);
  res.json({ success: result.success, data: { message: result.message } });
});

router.post('/wifi/stop', authenticate, requireAdmin, (req: Request, res: Response) => {
  const result = wifiService.stopWifiAp(req.user!.userId);
  res.json({ success: result.success, data: { message: result.message } });
});

// --- Server Configuration Export/Import ---
router.get('/config/export', authenticate, requireAdmin, (_req: Request, res: Response) => {
  const data = configService.exportConfig();
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="edge-config-${new Date().toISOString().slice(0, 10)}.json"`);
  res.json({ success: true, data });
});

router.post('/config/import', authenticate, requireSuperAdmin, (req: Request, res: Response, next: NextFunction) => {
  try {
    const { config: configData, overwrite, sections } = req.body;
    if (!configData) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'config data is required' } });
    }
    const result = configService.importConfig(configData, req.user!.userId, { overwrite, sections });
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

// --- Branding / Business Customization ---
router.get('/branding', authenticate, requireAdmin, (_req: Request, res: Response) => {
  res.json({ success: true, data: brandingService.getBranding() });
});

router.put('/branding', authenticate, requireAdmin, (req: Request, res: Response, next: NextFunction) => {
  try {
    const branding = brandingService.updateBranding(req.body, req.user!.userId);
    res.json({ success: true, data: branding });
  } catch (err) { next(err); }
});

// --- Logo Management ---
router.get('/logos', authenticate, requireAdmin, (_req: Request, res: Response) => {
  res.json({ success: true, data: brandingService.listLogos() });
});

router.get('/logos/:type', (_req: Request, res: Response, next: NextFunction) => {
  try {
    const type = _req.params.type as 'primary' | 'secondary' | 'favicon' | 'splash';
    const { data, mimeType } = brandingService.getLogo(type);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(data);
  } catch (err) { next(err); }
});

router.post('/logos/:type', authenticate, requireAdmin, logoUpload.single('file'), (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'File is required' } });
    }
    const type = req.params.type as 'primary' | 'secondary' | 'favicon' | 'splash';
    const validTypes = ['primary', 'secondary', 'favicon', 'splash'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: `Type must be one of: ${validTypes.join(', ')}` } });
    }
    const logo = brandingService.uploadLogo(type, req.file.buffer, req.file.mimetype, req.user!.userId);
    res.status(201).json({ success: true, data: logo });
  } catch (err) { next(err); }
});

router.delete('/logos/:type', authenticate, requireAdmin, (req: Request, res: Response, next: NextFunction) => {
  try {
    const type = req.params.type as 'primary' | 'secondary' | 'favicon' | 'splash';
    brandingService.deleteLogo(type, req.user!.userId);
    res.json({ success: true });
  } catch (err) { next(err); }
});

// --- Public branding endpoint (no auth required for client display) ---
router.get('/public/branding', (_req: Request, res: Response) => {
  res.json({ success: true, data: brandingService.getBranding() });
});

// --- Audit log ---
router.get('/audit-log', authenticate, requireAdmin, (req: Request, res: Response) => {
  const { limit, offset, action, actorId, targetType } = req.query;
  const result = getAuditLogs({
    limit: limit ? parseInt(limit as string) : undefined,
    offset: offset ? parseInt(offset as string) : undefined,
    action: action as string,
    actorId: actorId as string,
    targetType: targetType as string,
  });
  res.json({ success: true, data: result.entries, meta: { total: result.total } });
});

export default router;
