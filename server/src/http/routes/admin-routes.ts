import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, requireAdmin, requireSuperAdmin, requireRole } from '../../auth/middleware';
import * as deviceService from '../../admin/device-service';
import * as commConfigService from '../../admin/comm-config-service';
import * as tagMappingService from '../../admin/tag-mapping-service';
import * as featureFlagService from '../../admin/feature-flag-service';
import * as layoutService from '../../admin/layout-service';
import { getAuditLogs } from '../../auth/audit';
import { UserRole, Protocol } from '../../shared/models';
import { wsHandler } from '../../websocket/ws-handler';
import { mqttBroker } from '../../mqtt/mqtt-broker';
import { modbusServer } from '../../modbus/modbus-server';
import { modbusClient } from '../../modbus/modbus-client';

const router = Router();

// --- System dashboard ---
router.get('/dashboard', authenticate, requireAdmin, (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      wsClients: wsHandler.getConnectedCount(),
      mqttClients: mqttBroker.getConnectedClients(),
      mqttRunning: mqttBroker.isRunning(),
      modbusServerRunning: modbusServer.isRunning(),
      modbusClientConnected: modbusClient.isConnected(),
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
