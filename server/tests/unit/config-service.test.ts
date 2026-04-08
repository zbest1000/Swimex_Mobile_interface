import fs from 'fs';
import os from 'os';
import path from 'path';
import { closeDatabase, getDb, initDatabase } from '../../src/database/connection';
import { runMigrations } from '../../src/database/migrate';
import { importConfig, ServerConfigExport } from '../../src/admin/config-service';

describe('config-service import', () => {
  const testDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'edge-config-test-'));

  beforeAll(() => {
    initDatabase(testDataDir);
    runMigrations();
  });

  afterAll(() => {
    closeDatabase();
    fs.rmSync(testDataDir, { recursive: true, force: true });
  });

  test('does not overwrite wifi config when encrypted password cannot be decrypted', () => {
    const db = getDb();
    const existingWifiConfig = {
      ssid: 'ExistingSSID',
      password: 'ExistingPass123!',
      channel: 6,
      band: '2.4GHz',
      hidden: false,
      maxClients: 10,
      interface: 'wlan0',
    };

    db.prepare("INSERT OR REPLACE INTO system_config (key, value, updated_at) VALUES ('wifi_ap_config', ?, datetime('now'))")
      .run(JSON.stringify(existingWifiConfig));

    const importPayload: ServerConfigExport = {
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
        password_encrypted: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      },
    };

    const result = importConfig(importPayload, 'test-actor', { sections: ['wifiConfig'], overwrite: true });

    const row = db.prepare("SELECT value FROM system_config WHERE key = 'wifi_ap_config'").get() as { value: string };
    const storedWifiConfig = JSON.parse(row.value);

    expect(storedWifiConfig).toEqual(existingWifiConfig);
    expect(result.imported).not.toContain('wifiConfig');
    expect(result.skipped).toContain('wifiConfig');
    expect(result.errors).toContain('wifiConfig: could not decrypt WiFi password (different server key?)');
  });
});
