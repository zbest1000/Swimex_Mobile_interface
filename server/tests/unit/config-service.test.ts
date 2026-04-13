import { initDatabase, closeDatabase, getDb } from '../../src/database/connection';
import { runMigrations } from '../../src/database/migrate';
import { importConfig, ServerConfigExport } from '../../src/admin/config-service';

describe('ConfigService', () => {
  const testDataDir = '/tmp/edge-test-config-' + Date.now();

  beforeAll(() => {
    initDatabase(testDataDir);
    runMigrations();
  });

  afterAll(() => {
    closeDatabase();
  });

  test('does not overwrite wifi config when encrypted password cannot be decrypted', () => {
    const db = getDb();
    const existingWifiConfig = {
      ssid: 'ExistingSSID',
      password: 'ExistingPassword123!',
      channel: 11,
      band: '2.4GHz',
      hidden: false,
      maxClients: 8,
      interface: 'wlan0',
    };

    db.prepare(
      "INSERT OR REPLACE INTO system_config (key, value, updated_at) VALUES ('wifi_ap_config', ?, datetime('now'))",
    ).run(JSON.stringify(existingWifiConfig));

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
        channel: 6,
        band: '2.4GHz',
        hidden: false,
        maxClients: 10,
        interface: 'wlan0',
        password_encrypted: 'invalid-encrypted-payload',
      },
    };

    const result = importConfig(importPayload, 'test-actor', { sections: ['wifiConfig'], overwrite: true });
    const storedRow = db.prepare("SELECT value FROM system_config WHERE key = 'wifi_ap_config'").get() as { value: string };
    const storedWifiConfig = JSON.parse(storedRow.value);

    expect(result.errors).toContain('wifiConfig: could not decrypt WiFi password (different server key?)');
    expect(result.imported).not.toContain('wifiConfig');
    expect(result.skipped).toContain('wifiConfig');
    expect(storedWifiConfig).toEqual(existingWifiConfig);
  });
});
