import { initDatabase, closeDatabase, getDb } from '../../src/database/connection';
import { runMigrations } from '../../src/database/migrate';
import { importConfig, ServerConfigExport } from '../../src/admin/config-service';
import { getWifiConfig } from '../../src/admin/wifi-service';

describe('Config import security', () => {
  const testDataDir = '/tmp/edge-test-config-import-' + Date.now();

  beforeAll(() => {
    initDatabase(testDataDir);
    runMigrations();
  });

  afterAll(() => {
    closeDatabase();
  });

  test('does not overwrite WiFi password when encrypted password cannot be decrypted', () => {
    const db = getDb();
    const existingWifiConfig = {
      ssid: 'ExistingPoolCtrl',
      password: 'UltraSecure#987',
      channel: 6,
      band: '2.4GHz',
      hidden: false,
      maxClients: 10,
      interface: 'wlan0',
    };

    db.prepare(
      "INSERT OR REPLACE INTO system_config (key, value, updated_at) VALUES ('wifi_ap_config', ?, datetime('now'))"
    ).run(JSON.stringify(existingWifiConfig));

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
        ssid: 'ImportedPoolCtrl',
        channel: 11,
        band: '2.4GHz',
        hidden: false,
        maxClients: 20,
        interface: 'wlan0',
        password_encrypted: 'invalid',
      },
    };

    const result = importConfig(payload, 'automation-test', {
      overwrite: true,
      sections: ['wifiConfig'],
    });

    expect(result.imported).not.toContain('wifiConfig');
    expect(result.skipped).toContain('wifiConfig');
    expect(result.errors).toContain(
      'wifiConfig: could not decrypt WiFi password (different server key?)'
    );

    const wifiAfterImport = getWifiConfig();
    expect(wifiAfterImport.password).toBe(existingWifiConfig.password);
    expect(wifiAfterImport.password).not.toBe('Swimex2026!');
    expect(wifiAfterImport.ssid).toBe(existingWifiConfig.ssid);
  });
});
