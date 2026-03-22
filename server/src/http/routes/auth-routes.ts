import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import rateLimit from 'express-rate-limit';
import * as authService from '../../auth/auth-service';
import { authenticate, requireSuperAdmin } from '../../auth/middleware';
import { UserRole, CommissioningOrg } from '../../shared/models';
import { ValidationError, ForbiddenError } from '../../utils/errors';
import { isSystemCommissioned, markCommissioned, setSystemConfig, getSystemConfig } from '../../database/seed';
import { getDb } from '../../database/connection';
import { auditLog } from '../../auth/audit';

const router = Router();

const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'RATE_LIMIT', message: 'Too many attempts, please try again later' } },
});

const registerRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'RATE_LIMIT', message: 'Too many registration attempts, please try again later' } },
});

const commissionRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'RATE_LIMIT', message: 'Too many commissioning attempts, please try again later' } },
});

// --- Public: check commissioning state ---

router.get('/system-status', (_req: Request, res: Response) => {
  const commissioned = isSystemCommissioned();
  res.json({
    success: true,
    data: {
      commissioned,
      commissioningStep: commissioned ? null : parseInt(getSystemConfig('commissioning_step') ?? '0', 10),
    },
  });
});

// --- Registration (only available after commissioning) ---

router.post('/register', registerRateLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!isSystemCommissioned()) {
      throw new ForbiddenError('System must be commissioned before users can register');
    }
    const { username, password, displayName, email } = req.body;
    const user = await authService.createUser(username, password, displayName, UserRole.USER, email);
    const { token } = await authService.login(username, password);
    res.status(201).json({ success: true, data: { user, token } });
  } catch (err) { next(err); }
});

// --- Login ---

router.post('/login', authRateLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username, password } = req.body;
    const sourceIp = req.ip || req.socket.remoteAddress;
    const result = await authService.login(username, password, sourceIp);
    const commissioned = isSystemCommissioned();

    res.json({
      success: true,
      data: {
        ...result,
        commissioned,
        commissioningRequired: !commissioned && result.user.role === UserRole.SUPER_ADMINISTRATOR,
      },
    });
  } catch (err) { next(err); }
});

router.post('/logout', authenticate, (req: Request, res: Response, next: NextFunction) => {
  try {
    const sessionId = req.user?.sessionId;
    if (sessionId) {
      const db = getDb();
      db.prepare('UPDATE sessions SET is_revoked = 1 WHERE token = ?').run(sessionId);
    }
    res.json({ success: true });
  } catch (err) { next(err); }
});

router.get('/me', authenticate, (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = authService.getUserById(req.user!.userId);
    const prefs = authService.getUserPreferences(req.user!.userId);
    res.json({ success: true, data: { user, preferences: prefs } });
  } catch (err) { next(err); }
});

router.put('/me/preferences', authenticate, (req: Request, res: Response, next: NextFunction) => {
  try {
    authService.updateUserPreferences(req.user!.userId, req.body);
    const prefs = authService.getUserPreferences(req.user!.userId);
    res.json({ success: true, data: prefs });
  } catch (err) { next(err); }
});

router.put('/me/password', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword) {
      throw new ValidationError('Current password is required');
    }
    await authService.updatePassword(req.user!.userId, newPassword, req.user!.userId, currentPassword);
    res.json({ success: true });
  } catch (err) { next(err); }
});

// --- Commissioning Wizard (Super Admin only) ---

/**
 * Step 1: Set commissioning codes (SwimEx + BSC Industries)
 */
router.post('/commission/step1-codes', commissionRateLimiter, authenticate, requireSuperAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (isSystemCommissioned()) throw new ValidationError('System is already commissioned');

    const { swimexCode, bscCode } = req.body;
    if (!swimexCode) throw new ValidationError('SwimEx commissioning code is required');
    if (!bscCode) throw new ValidationError('BSC Industries commissioning code is required');

    // Validate format: 4 segments of 6 alphanumeric chars
    const codePattern = /^[A-Z0-9]{6}-[A-Z0-9]{6}-[A-Z0-9]{6}-[A-Z0-9]{6}$/i;
    if (!codePattern.test(swimexCode)) {
      throw new ValidationError('SwimEx code must be in format XXXXXX-XXXXXX-XXXXXX-XXXXXX (6 alphanumeric characters per segment)');
    }
    if (!codePattern.test(bscCode)) {
      throw new ValidationError('BSC code must be in format XXXXXX-XXXXXX-XXXXXX-XXXXXX (6 alphanumeric characters per segment)');
    }

    await authService.setCommissioningCode(CommissioningOrg.SWIMEX, swimexCode);
    await authService.setCommissioningCode(CommissioningOrg.BSC_INDUSTRIES, bscCode);

    setSystemConfig('commissioning_step', '1');
    auditLog('COMMISSIONING_STEP1', req.user!.userId, 'system', 'commissioning', { step: 'codes_set' }, req.ip);

    res.json({ success: true, data: { step: 1, message: 'Commissioning codes saved' } });
  } catch (err) { next(err); }
});

/**
 * Step 2: Change Super Admin password + create Administrator account
 */
router.post('/commission/step2-accounts', authenticate, requireSuperAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (isSystemCommissioned()) throw new ValidationError('System is already commissioned');

    const { superAdminNewPassword, adminUsername, adminPassword, adminDisplayName } = req.body;

    // Change the super admin default password
    if (!superAdminNewPassword || superAdminNewPassword.length < 8) {
      throw new ValidationError('Super Admin password must be at least 8 characters');
    }
    await authService.updatePassword(req.user!.userId, superAdminNewPassword);

    // Create the administrator account
    if (!adminUsername || adminUsername.length < 3) throw new ValidationError('Admin username must be at least 3 characters');
    if (!adminPassword || adminPassword.length < 4) throw new ValidationError('Admin password must be at least 4 characters');

    const admin = await authService.createUser(
      adminUsername,
      adminPassword,
      adminDisplayName || adminUsername,
      UserRole.ADMINISTRATOR,
      undefined,
      req.user!.userId,
    );

    setSystemConfig('commissioning_step', '2');
    auditLog('COMMISSIONING_STEP2', req.user!.userId, 'system', 'commissioning', { step: 'accounts_created', adminUsername }, req.ip);

    res.json({ success: true, data: { step: 2, admin, message: 'Accounts configured' } });
  } catch (err) { next(err); }
});

/**
 * Step 3: Network configuration (Wi-Fi AP settings)
 */
router.post('/commission/step3-network', authenticate, requireSuperAdmin, (req: Request, res: Response, next: NextFunction) => {
  try {
    if (isSystemCommissioned()) throw new ValidationError('System is already commissioned');

    const { wifiSsid, wifiPassword, wifiChannel, serverIp, subnetMask, gateway } = req.body;

    // Save network config (legacy system_config keys)
    setSystemConfig('wifi_ssid', wifiSsid || 'PoolCtrl');
    setSystemConfig('wifi_password', wifiPassword || '');
    setSystemConfig('wifi_channel', String(wifiChannel || 6));
    setSystemConfig('server_ip', serverIp || '');
    setSystemConfig('subnet_mask', subnetMask || '255.255.255.0');
    setSystemConfig('gateway', gateway || '');

    // Also save to the unified WiFi AP config used by the wifi-service
    try {
      const wifiService = require('../../admin/wifi-service');
      wifiService.updateWifiConfig({
        ssid: wifiSsid || 'PoolCtrl',
        password: wifiPassword || 'swimex2024',
        channel: wifiChannel || 6,
      }, req.user!.userId);
    } catch (err: any) {
      // Non-fatal: wifi-service config is optional during commissioning
    }

    setSystemConfig('commissioning_step', '3');
    auditLog('COMMISSIONING_STEP3', req.user!.userId, 'system', 'commissioning', { step: 'network_configured', wifiSsid }, req.ip);

    res.json({ success: true, data: { step: 3, message: 'Network configured' } });
  } catch (err) { next(err); }
});

/**
 * Step 4: PLC communication setup
 */
router.post('/commission/step4-plc', authenticate, requireSuperAdmin, (req: Request, res: Response, next: NextFunction) => {
  try {
    if (isSystemCommissioned()) throw new ValidationError('System is already commissioned');

    const { protocol, plcIp, plcPort, mqttTopicPrefix, modbusUnitId, pollingIntervalMs } = req.body;

    setSystemConfig('plc_protocol', protocol || 'MQTT');
    setSystemConfig('plc_ip', plcIp || '');
    setSystemConfig('plc_port', String(plcPort || 502));
    setSystemConfig('mqtt_topic_prefix', mqttTopicPrefix || 'swimex/default');
    setSystemConfig('modbus_unit_id', String(modbusUnitId || 1));
    setSystemConfig('plc_polling_interval', String(pollingIntervalMs || 500));

    // Create communication config record
    const db = getDb();
    if (protocol === 'MODBUS_TCP' && plcIp) {
      db.prepare(`
        INSERT INTO communication_configs (id, protocol, name, is_active, config, created_by)
        VALUES (?, 'MODBUS_TCP', 'PLC Connection', 1, ?, ?)
      `).run(uuidv4(), JSON.stringify({
        mode: 'CLIENT',
        host: plcIp,
        port: plcPort || 502,
        unitId: modbusUnitId || 1,
        pollingInterval: pollingIntervalMs || 500,
        timeout: 5000,
        retries: 3,
        writeStrategy: 'WRITE_ON_CHANGE',
      }), req.user!.userId);
    }

    setSystemConfig('commissioning_step', '4');
    auditLog('COMMISSIONING_STEP4', req.user!.userId, 'system', 'commissioning', { step: 'plc_configured', protocol, plcIp }, req.ip);

    res.json({ success: true, data: { step: 4, message: 'PLC communication configured' } });
  } catch (err) { next(err); }
});

/**
 * Step 5: Finalize commissioning — register initial tablets, create default layout, seed sample data
 */
router.post('/commission/step5-finalize', authenticate, requireSuperAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (isSystemCommissioned()) throw new ValidationError('System is already commissioned');

    const { tabletMacs, template } = req.body;
    const db = getDb();

    // Register tablets
    if (tabletMacs && Array.isArray(tabletMacs)) {
      for (const entry of tabletMacs) {
        if (entry.mac) {
          const mac = entry.mac.toUpperCase().trim();
          db.prepare(`
            INSERT OR IGNORE INTO registered_devices (id, mac_address, device_name, device_type, is_registered, registered_by)
            VALUES (?, ?, ?, 'TABLET', 1, ?)
          `).run(uuidv4(), mac, entry.name || 'Pool Tablet', req.user!.userId);
        }
      }
    }

    // Create default UI layout
    db.prepare(`
      INSERT INTO ui_layouts (id, name, template_id, is_active, widgets, version)
      VALUES (?, 'Default Layout', ?, 1, '[]', 1)
    `).run(uuidv4(), template || 'modern');

    // Seed sample workout programs
    const adminRow = db.prepare("SELECT id FROM users WHERE role = 'ADMINISTRATOR' LIMIT 1").get() as { id: string } | undefined;
    const ownerId = adminRow?.id ?? req.user!.userId;
    const samplePrograms = [
      {
        name: 'Morning Warm-Up', type: 'CUSTOM', sets: 1,
        steps: [
          { order: 1, minutes: 3, seconds: 0, speed: 20 },
          { order: 2, minutes: 5, seconds: 0, speed: 35 },
          { order: 3, minutes: 5, seconds: 0, speed: 45 },
          { order: 4, minutes: 2, seconds: 0, speed: 25 },
        ],
      },
      {
        name: 'Endurance Builder', type: 'CUSTOM', sets: 2,
        steps: [
          { order: 1, minutes: 5, seconds: 0, speed: 30 },
          { order: 2, minutes: 10, seconds: 0, speed: 50 },
          { order: 3, minutes: 5, seconds: 0, speed: 60 },
          { order: 4, minutes: 5, seconds: 0, speed: 40 },
          { order: 5, minutes: 3, seconds: 0, speed: 25 },
        ],
      },
      {
        name: 'Recovery Session', type: 'CUSTOM', sets: 1,
        steps: [
          { order: 1, minutes: 10, seconds: 0, speed: 15 },
          { order: 2, minutes: 10, seconds: 0, speed: 20 },
          { order: 3, minutes: 5, seconds: 0, speed: 10 },
        ],
      },
    ];

    for (const prog of samplePrograms) {
      db.prepare(`
        INSERT INTO workout_programs (id, owner_id, name, type, sets, steps, is_public)
        VALUES (?, ?, ?, ?, ?, ?, 1)
      `).run(uuidv4(), ownerId, prog.name, prog.type, prog.sets, JSON.stringify(prog.steps));
    }

    // Mark system as commissioned!
    markCommissioned();
    setSystemConfig('commissioning_step', '5');
    setSystemConfig('commissioned_at', new Date().toISOString());
    setSystemConfig('commissioned_by', req.user!.userId);

    auditLog('COMMISSIONING_COMPLETE', req.user!.userId, 'system', 'commissioning', { step: 'finalized' }, req.ip);

    res.json({
      success: true,
      data: {
        step: 5,
        commissioned: true,
        message: 'System commissioning complete! The system is now ready for use.',
      },
    });
  } catch (err) { next(err); }
});

/**
 * Get full commissioning status (for wizard resume)
 */
router.get('/commission/status', authenticate, requireSuperAdmin, (_req: Request, res: Response) => {
  const commissioned = isSystemCommissioned();
  const step = parseInt(getSystemConfig('commissioning_step') ?? '0', 10);

  const networkConfig = commissioned || step >= 3 ? {
    wifiSsid: getSystemConfig('wifi_ssid'),
    wifiChannel: getSystemConfig('wifi_channel'),
    serverIp: getSystemConfig('server_ip'),
  } : null;

  const plcConfig = commissioned || step >= 4 ? {
    protocol: getSystemConfig('plc_protocol'),
    plcIp: getSystemConfig('plc_ip'),
    plcPort: getSystemConfig('plc_port'),
  } : null;

  res.json({
    success: true,
    data: {
      commissioned,
      currentStep: step,
      networkConfig,
      plcConfig,
      commissionedAt: getSystemConfig('commissioned_at'),
    },
  });
});

// --- Super Admin account reset (via commissioning code) ---

router.post('/reset-super-admin', authRateLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organization, code, newUsername, newPassword } = req.body;
    const sourceIp = req.ip || req.socket.remoteAddress;
    const org = organization as CommissioningOrg;

    if (!Object.values(CommissioningOrg).includes(org)) {
      throw new ValidationError('Invalid organization. Must be SWIMEX or BSC_INDUSTRIES');
    }

    const user = await authService.resetSuperAdmin(org, code, newUsername, newPassword, sourceIp);
    res.json({ success: true, data: { user } });
  } catch (err) { next(err); }
});

export default router;
