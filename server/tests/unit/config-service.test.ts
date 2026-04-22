import { initDatabase, closeDatabase, getDb } from '../../src/database/connection';
import { runMigrations } from '../../src/database/migrate';
import { importConfig, ServerConfigExport } from '../../src/admin/config-service';

describe('ConfigService', () => {
  const testDataDir = '/tmp/edge-config-test-' + Date.now();

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
      ssid: 'PoolCtrl',
      password: 'CurrentStrongPassword1!',
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
        ssid: 'ImportedSSID',
        channel: 11,
        password_encrypted: 'not-a-valid-encrypted-blob',
      },
    };

    const result = importConfig(payload, 'automation', { overwrite: true, sections: ['wifiConfig'] });

    const row = db.prepare("SELECT value FROM system_config WHERE key = 'wifi_ap_config'").get() as { value: string };
    const persisted = JSON.parse(row.value) as Record<string, unknown>;

    expect(result.errors).toContain('wifiConfig: could not decrypt WiFi password (different server key?)');
    expect(persisted.password).toBe('CurrentStrongPassword1!');
  });
});
