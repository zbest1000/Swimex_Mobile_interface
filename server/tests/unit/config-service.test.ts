import fs from 'fs';
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
    fs.rmSync(testDataDir, { recursive: true, force: true });
  });

  test('does not overwrite WiFi config when encrypted password cannot be decrypted', () => {
    const db = getDb();
    const existingWifiConfig = {
      ssid: 'ExistingPool',
      password: 'VeryStrongPass123!',
      channel: 6,
      band: '2.4GHz',
      hidden: false,
      maxClients: 10,
      interface: 'wlan0',
    };

    db.prepare(
      "INSERT OR REPLACE INTO system_config (key, value, updated_at) VALUES ('wifi_ap_config', ?, datetime('now'))"
    ).run(JSON.stringify(existingWifiConfig));

    const undecryptableBlob = Buffer.alloc(48, 1).toString('base64');
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
        ...existingWifiConfig,
        ssid: 'ImportedPool',
        password_encrypted: undecryptableBlob,
      } as Record<string, unknown>,
    };

    delete (payload.wifiConfig as Record<string, unknown>).password;

    const result = importConfig(payload, 'actor-1', { overwrite: true, sections: ['wifiConfig'] });

    expect(result.errors).toContain('wifiConfig: could not decrypt WiFi password (different server key?)');
    expect(result.imported).not.toContain('wifiConfig');

    const wifiRow = db
      .prepare("SELECT value FROM system_config WHERE key = 'wifi_ap_config'")
      .get() as { value: string };
    const storedWifiConfig = JSON.parse(wifiRow.value);

    expect(storedWifiConfig).toEqual(existingWifiConfig);
  });
});
