import { getDb } from '../database/connection';
import { createLogger } from '../utils/logger';
import { auditLog } from '../auth/audit';
import { ValidationError } from '../utils/errors';
import { encrypt, decrypt } from '../utils/crypto';

const log = createLogger('config-service');

export interface ServerConfigExport {
  version: string;
  exportedAt: string;
  system: Record<string, string>;
  communicationConfigs: Record<string, unknown>[];
  tagMappings: Record<string, unknown>[];
  featureFlags: Record<string, unknown>[];
  devices: Record<string, unknown>[];
  layouts: Record<string, unknown>[];
  branding: Record<string, unknown> | null;
  wifiConfig: Record<string, unknown> | null;
}

export function exportConfig(): ServerConfigExport {
  const db = getDb();

  const SENSITIVE_KEYS = new Set(['wifi_password', 'jwt_secret']);
  const system: Record<string, string> = {};
  const sysRows = db.prepare('SELECT key, value FROM system_config').all() as { key: string; value: string }[];
  for (const row of sysRows) {
    if (SENSITIVE_KEYS.has(row.key)) continue;
    system[row.key] = row.value;
  }

  const communicationConfigs = db.prepare(
    'SELECT id, protocol, name, is_active, config, updated_at FROM communication_configs'
  ).all() as Record<string, unknown>[];

  const tagMappings = db.prepare(
    'SELECT id, object_id, object_name, tag_address, protocol, data_type, access_mode, scale_factor, "offset", updated_at FROM object_tag_mappings'
  ).all() as Record<string, unknown>[];

  const featureFlags = db.prepare(
    'SELECT id, feature_key, display_name, description, is_enabled, is_visible, updated_at FROM feature_flags'
  ).all() as Record<string, unknown>[];

  const devices = db.prepare(
    'SELECT id, mac_address, device_name, device_type, is_registered, registered_at FROM registered_devices'
  ).all() as Record<string, unknown>[];

  const layouts = db.prepare(
    'SELECT id, name, template_id, is_active, widgets, version, updated_at FROM ui_layouts'
  ).all() as Record<string, unknown>[];

  let branding: Record<string, unknown> | null = null;
  try {
    const brandingRow = db.prepare("SELECT value FROM system_config WHERE key = 'branding'").get() as { value: string } | undefined;
    if (brandingRow) {
      branding = JSON.parse(brandingRow.value);
    }
  } catch { /* table may not exist yet */ }

  let wifiConfig: Record<string, unknown> | null = null;
  try {
    const wifiRow = db.prepare("SELECT value FROM system_config WHERE key = 'wifi_ap_config'").get() as { value: string } | undefined;
    if (wifiRow) {
      const parsed = JSON.parse(wifiRow.value);
      if (parsed.password) {
        parsed.password_encrypted = encrypt(parsed.password);
        delete parsed.password;
      }
      wifiConfig = parsed;
    }
  } catch { /* no wifi config yet */ }

  log.info('Configuration exported');

  return {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    system,
    communicationConfigs,
    tagMappings,
    featureFlags,
    devices,
    layouts,
    branding,
    wifiConfig,
  };
}

export function importConfig(
  data: ServerConfigExport,
  actorId: string,
  options: { overwrite?: boolean; sections?: string[] } = {},
): { imported: string[]; skipped: string[]; errors: string[] } {
  if (!data || !data.version) {
    throw new ValidationError('Invalid configuration file: missing version');
  }

  const db = getDb();
  const imported: string[] = [];
  const skipped: string[] = [];
  const errors: string[] = [];
  const sections = options.sections ?? ['all'];
  const shouldImport = (section: string) => sections.includes('all') || sections.includes(section);

  const runInTransaction = db.transaction(() => {
    if (shouldImport('system') && data.system) {
      try {
        for (const [key, value] of Object.entries(data.system)) {
          if (key === 'commissioned') continue;
          if (options.overwrite) {
            db.prepare('INSERT OR REPLACE INTO system_config (key, value, updated_at) VALUES (?, ?, datetime(\'now\'))').run(key, value);
          } else {
            db.prepare('INSERT OR IGNORE INTO system_config (key, value, updated_at) VALUES (?, ?, datetime(\'now\'))').run(key, value);
          }
        }
        imported.push('system');
      } catch (err: any) {
        errors.push(`system: ${err.message}`);
      }
    }

    if (shouldImport('communicationConfigs') && data.communicationConfigs?.length) {
      try {
        for (const cfg of data.communicationConfigs) {
          if (options.overwrite) {
            db.prepare(`
              INSERT OR REPLACE INTO communication_configs (id, protocol, name, is_active, config, updated_at)
              VALUES (?, ?, ?, ?, ?, datetime('now'))
            `).run(cfg.id, cfg.protocol, cfg.name, cfg.is_active, cfg.config);
          } else {
            db.prepare(`
              INSERT OR IGNORE INTO communication_configs (id, protocol, name, is_active, config, updated_at)
              VALUES (?, ?, ?, ?, ?, datetime('now'))
            `).run(cfg.id, cfg.protocol, cfg.name, cfg.is_active, cfg.config);
          }
        }
        imported.push(`communicationConfigs (${data.communicationConfigs.length})`);
      } catch (err: any) {
        errors.push(`communicationConfigs: ${err.message}`);
      }
    }

    if (shouldImport('tagMappings') && data.tagMappings?.length) {
      try {
        for (const mapping of data.tagMappings) {
          if (options.overwrite) {
            db.prepare(`
              INSERT OR REPLACE INTO object_tag_mappings (id, object_id, object_name, tag_address, protocol, data_type, access_mode, scale_factor, "offset", updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
            `).run(mapping.id, mapping.object_id, mapping.object_name, mapping.tag_address, mapping.protocol, mapping.data_type, mapping.access_mode, mapping.scale_factor, mapping.offset);
          } else {
            db.prepare(`
              INSERT OR IGNORE INTO object_tag_mappings (id, object_id, object_name, tag_address, protocol, data_type, access_mode, scale_factor, "offset", updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
            `).run(mapping.id, mapping.object_id, mapping.object_name, mapping.tag_address, mapping.protocol, mapping.data_type, mapping.access_mode, mapping.scale_factor, mapping.offset);
          }
        }
        imported.push(`tagMappings (${data.tagMappings.length})`);
      } catch (err: any) {
        errors.push(`tagMappings: ${err.message}`);
      }
    }

    if (shouldImport('featureFlags') && data.featureFlags?.length) {
      try {
        for (const flag of data.featureFlags) {
          if (options.overwrite) {
            db.prepare(`
              INSERT OR REPLACE INTO feature_flags (id, feature_key, display_name, description, is_enabled, is_visible, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
            `).run(flag.id, flag.feature_key, flag.display_name, flag.description, flag.is_enabled, flag.is_visible);
          } else {
            db.prepare(`
              INSERT OR IGNORE INTO feature_flags (id, feature_key, display_name, description, is_enabled, is_visible, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
            `).run(flag.id, flag.feature_key, flag.display_name, flag.description, flag.is_enabled, flag.is_visible);
          }
        }
        imported.push(`featureFlags (${data.featureFlags.length})`);
      } catch (err: any) {
        errors.push(`featureFlags: ${err.message}`);
      }
    }

    if (shouldImport('devices') && data.devices?.length) {
      try {
        for (const device of data.devices) {
          if (options.overwrite) {
            db.prepare(`
              INSERT OR REPLACE INTO registered_devices (id, mac_address, device_name, device_type, is_registered, registered_at)
              VALUES (?, ?, ?, ?, ?, ?)
            `).run(device.id, device.mac_address, device.device_name, device.device_type, device.is_registered, device.registered_at);
          } else {
            db.prepare(`
              INSERT OR IGNORE INTO registered_devices (id, mac_address, device_name, device_type, is_registered, registered_at)
              VALUES (?, ?, ?, ?, ?, ?)
            `).run(device.id, device.mac_address, device.device_name, device.device_type, device.is_registered, device.registered_at);
          }
        }
        imported.push(`devices (${data.devices.length})`);
      } catch (err: any) {
        errors.push(`devices: ${err.message}`);
      }
    }

    if (shouldImport('layouts') && data.layouts?.length) {
      try {
        for (const layout of data.layouts) {
          if (options.overwrite) {
            db.prepare(`
              INSERT OR REPLACE INTO ui_layouts (id, name, template_id, is_active, widgets, version, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
            `).run(layout.id, layout.name, layout.template_id, layout.is_active, layout.widgets, layout.version);
          } else {
            db.prepare(`
              INSERT OR IGNORE INTO ui_layouts (id, name, template_id, is_active, widgets, version, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
            `).run(layout.id, layout.name, layout.template_id, layout.is_active, layout.widgets, layout.version);
          }
        }
        imported.push(`layouts (${data.layouts.length})`);
      } catch (err: any) {
        errors.push(`layouts: ${err.message}`);
      }
    }

    if (shouldImport('branding') && data.branding) {
      try {
        db.prepare("INSERT OR REPLACE INTO system_config (key, value, updated_at) VALUES ('branding', ?, datetime('now'))").run(JSON.stringify(data.branding));
        imported.push('branding');
      } catch (err: any) {
        errors.push(`branding: ${err.message}`);
      }
    }

    if (shouldImport('wifiConfig') && data.wifiConfig) {
      try {
        const wifiData = { ...data.wifiConfig };
        let canImportWifi = true;
        if (wifiData.password_encrypted && !wifiData.password) {
          const decrypted = decrypt(wifiData.password_encrypted as string);
          if (decrypted) {
            wifiData.password = decrypted;
          } else {
            errors.push('wifiConfig: could not decrypt WiFi password (different server key?)');
            canImportWifi = false;
          }
          delete wifiData.password_encrypted;
        }

        // Never overwrite WiFi config with a payload that lacks a usable password.
        // Importing password-less config would silently fall back to default password.
        if (!wifiData.password || typeof wifiData.password !== 'string') {
          const existingWifiRow = db.prepare("SELECT value FROM system_config WHERE key = 'wifi_ap_config'").get() as { value: string } | undefined;
          if (existingWifiRow) {
            try {
              const existingWifi = JSON.parse(existingWifiRow.value) as Record<string, unknown>;
              if (typeof existingWifi.password === 'string' && existingWifi.password.length > 0) {
                wifiData.password = existingWifi.password;
              } else {
                errors.push('wifiConfig: missing WiFi password in import payload');
                canImportWifi = false;
              }
            } catch {
              errors.push('wifiConfig: missing WiFi password in import payload');
              canImportWifi = false;
            }
          } else {
            errors.push('wifiConfig: missing WiFi password in import payload');
            canImportWifi = false;
          }
        }

        if (canImportWifi) {
          db.prepare("INSERT OR REPLACE INTO system_config (key, value, updated_at) VALUES ('wifi_ap_config', ?, datetime('now'))").run(JSON.stringify(wifiData));
          imported.push('wifiConfig');
        } else {
          skipped.push('wifiConfig');
        }
      } catch (err: any) {
        errors.push(`wifiConfig: ${err.message}`);
      }
    }
  });

  runInTransaction();

  auditLog('CONFIG_IMPORTED', actorId, 'system', 'config', { imported, skipped, errors });
  log.info('Configuration imported', { imported, errors });

  return { imported, skipped, errors };
}
