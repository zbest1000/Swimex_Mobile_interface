import { initDatabase, closeDatabase, getDb } from '../../src/database/connection';
import { runMigrations } from '../../src/database/migrate';
import { importConfig } from '../../src/admin/config-service';
import { getWifiConfig } from '../../src/admin/wifi-service';
import { ServerConfigExport } from '../../src/admin/config-service';

describe('Config import safety', () => {
  const testDataDir = '/tmp/edge-test-config-import-' + Date.now();

  beforeAll(() => {
    initDatabase(testDataDir);
    runMigrations();
  });

  afterAll(() => {
    closeDatabase();
  });

  test('does not overwrite existing WiFi password when encrypted password cannot be decrypted', () => {
    const db = getDb();
    const existingWifiConfig = {
      ssid: 'SecurePool',
      password: 'CustomStrongPass9!',
      channel: 6,
      band: '2.4GHz',
      hidden: false,
      maxClients: 10,
      interface: 'wlan0',
    };

    db.prepare(
      "INSERT OR REPLACE INTO system_config (key, value, updated_at) VALUES ('wifi_ap_config', ?, datetime('now'))",
    ).run(JSON.stringify(existingWifiConfig));

    const configToImport: ServerConfigExport = {
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
        channel: 1,
        band: '2.4GHz',
        hidden: false,
        maxClients: 10,
        interface: 'wlan0',
        password_encrypted: 'not-a-valid-ciphertext',
      },
    };

    const result = importConfig(configToImport, 'test-actor', {
      overwrite: true,
      sections: ['wifiConfig'],
    });

    expect(result.imported).not.toContain('wifiConfig');
    expect(result.skipped).toContain('wifiConfig');
    expect(result.errors).toContain('wifiConfig: could not decrypt WiFi password (different server key?)');

    const persisted = getWifiConfig();
    expect(persisted.password).toBe(existingWifiConfig.password);
    expect(persisted.ssid).toBe(existingWifiConfig.ssid);
  });
});
