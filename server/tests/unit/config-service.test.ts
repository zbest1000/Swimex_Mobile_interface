import fs from 'fs';
import os from 'os';
import path from 'path';
import { initDatabase, closeDatabase, getDb } from '../../src/database/connection';
import { runMigrations } from '../../src/database/migrate';
import { importConfig, ServerConfigExport } from '../../src/admin/config-service';

describe('config-service import safety', () => {
  let testDataDir: string;

  beforeEach(() => {
    testDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'edge-config-import-test-'));
    initDatabase(testDataDir);
    runMigrations();
  });

  afterEach(() => {
    closeDatabase();
    fs.rmSync(testDataDir, { recursive: true, force: true });
  });

  test('does not overwrite WiFi config when encrypted password cannot be decrypted', () => {
    const db = getDb();
    const existingWifi = {
      ssid: 'ExistingSSID',
      password: 'ExistingSecret123!',
      channel: 6,
      band: '2.4GHz',
      hidden: false,
      maxClients: 10,
      interface: 'wlan0',
    };

    db.prepare(
      "INSERT OR REPLACE INTO system_config (key, value, updated_at) VALUES ('wifi_ap_config', ?, datetime('now'))",
    ).run(JSON.stringify(existingWifi));

    const payload: ServerConfigExport = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      system: {},
      communicationConfigs: [],
      tagMappings: [],
      featureFlags: [],
      devices: [],
      layouts: [],
      branding: null,
      wifiConfig: {
        ssid: 'ImportedSSID',
        password_encrypted: 'invalid',
      },
    };

    const result = importConfig(payload, 'actor-1', { sections: ['wifiConfig'], overwrite: true });

    expect(result.imported).not.toContain('wifiConfig');
    expect(result.skipped).toContain('wifiConfig');
    expect(result.errors).toContain('wifiConfig: could not decrypt WiFi password (different server key?)');

    const row = db
      .prepare("SELECT value FROM system_config WHERE key = 'wifi_ap_config'")
      .get() as { value: string };
    const persisted = JSON.parse(row.value) as { ssid: string; password: string };

    expect(persisted.ssid).toBe('ExistingSSID');
    expect(persisted.password).toBe('ExistingSecret123!');
  });
});
