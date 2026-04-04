import { initDatabase, closeDatabase, getDb } from '../../src/database/connection';
import { runMigrations } from '../../src/database/migrate';
import { importConfig, ServerConfigExport } from '../../src/admin/config-service';

describe('ConfigService WiFi import safety', () => {
  const testDataDir = `/tmp/edge-config-test-${Date.now()}`;

  beforeAll(() => {
    initDatabase(testDataDir);
    runMigrations();
  });

  afterAll(() => {
    closeDatabase();
  });

  test('does not overwrite existing WiFi password when encrypted import cannot be decrypted', () => {
    const db = getDb();
    db.prepare(
      "INSERT OR REPLACE INTO system_config (key, value, updated_at) VALUES ('wifi_ap_config', ?, datetime('now'))",
    ).run(JSON.stringify({
      ssid: 'ExistingSSID',
      password: 'StrongPoolPass123!',
      channel: 6,
      band: '2.4GHz',
      hidden: false,
      maxClients: 10,
      interface: 'wlan0',
    }));

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
        band: '2.4GHz',
        hidden: true,
        maxClients: 5,
        interface: 'wlan0',
        password_encrypted: 'not-a-valid-ciphertext',
      },
    };

    const result = importConfig(payload, 'test-actor', { overwrite: true, sections: ['wifiConfig'] });

    expect(result.skipped).toContain('wifiConfig');
    expect(result.errors.some((e) => e.includes('could not decrypt WiFi password'))).toBe(true);

    const row = db.prepare("SELECT value FROM system_config WHERE key = 'wifi_ap_config'").get() as { value: string };
    const parsed = JSON.parse(row.value);
    expect(parsed.ssid).toBe('ExistingSSID');
    expect(parsed.password).toBe('StrongPoolPass123!');
  });
});
