import { closeDatabase, getDb, initDatabase } from '../../src/database/connection';
import { runMigrations } from '../../src/database/migrate';
import { importConfig, ServerConfigExport } from '../../src/admin/config-service';

describe('ConfigService', () => {
  const testDataDir = `/tmp/edge-test-config-${Date.now()}-${process.pid}`;

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
      ssid: 'CurrentSSID',
      password: 'CurrentStrongPass123!',
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
        channel: 11,
        band: '2.4GHz',
        hidden: false,
        maxClients: 20,
        interface: 'wlan0',
        password_encrypted: 'not-a-valid-encrypted-password',
      },
    };

    const result = importConfig(importPayload, 'test-actor', { overwrite: true, sections: ['wifiConfig'] });

    expect(result.errors).toContain('wifiConfig: could not decrypt WiFi password (different server key?)');

    const row = db.prepare("SELECT value FROM system_config WHERE key = 'wifi_ap_config'")
      .get() as { value: string };
    const storedWifiConfig = JSON.parse(row.value) as Record<string, unknown>;

    expect(storedWifiConfig.ssid).toBe('ImportedSSID');
    expect(storedWifiConfig.password).toBe('CurrentStrongPass123!');
    expect(storedWifiConfig.password_encrypted).toBeUndefined();
  });
});
