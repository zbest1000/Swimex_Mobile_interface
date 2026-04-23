import fs from 'fs';
import { closeDatabase, getDb, initDatabase } from '../../src/database/connection';
import { runMigrations } from '../../src/database/migrate';
import { importConfig, ServerConfigExport } from '../../src/admin/config-service';

describe('config-service', () => {
  const testDataDir = '/tmp/edge-config-test-' + Date.now();

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
    const existingWifi = {
      ssid: 'StablePoolAP',
      password: 'OrigPass123!',
      channel: 6,
      band: '2.4GHz',
      hidden: false,
      maxClients: 10,
      interface: 'wlan0',
    };
    db.prepare(
      "INSERT OR REPLACE INTO system_config (key, value, updated_at) VALUES ('wifi_ap_config', ?, datetime('now'))"
    ).run(JSON.stringify(existingWifi));

    const importedConfig: ServerConfigExport = {
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
        ssid: 'BrokenImportSSID',
        password_encrypted: 'invalid-not-base64-ciphertext',
      },
    };

    const result = importConfig(importedConfig, 'actor-1', { sections: ['wifiConfig'], overwrite: true });

    expect(result.imported).not.toContain('wifiConfig');
    expect(result.skipped).toContain('wifiConfig');
    expect(result.errors).toContain('wifiConfig: could not decrypt WiFi password (different server key?)');

    const row = db.prepare("SELECT value FROM system_config WHERE key = 'wifi_ap_config'").get() as { value: string };
    const stored = JSON.parse(row.value) as Record<string, unknown>;
    expect(stored.ssid).toBe('StablePoolAP');
    expect(stored.password).toBe('OrigPass123!');
  });
});
