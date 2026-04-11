import fs from 'fs';
import { initDatabase, closeDatabase, getDb } from '../../src/database/connection';
import { runMigrations } from '../../src/database/migrate';
import { importConfig } from '../../src/admin/config-service';

describe('ConfigService', () => {
  const originalJwtSecret = process.env.JWT_SECRET;
  const testDataDir = '/tmp/edge-config-test-' + Date.now();

  beforeAll(() => {
    process.env.JWT_SECRET = 'test-secret-for-config-service-should-be-long-enough';
    initDatabase(testDataDir);
    runMigrations();
  });

  afterAll(() => {
    closeDatabase();
    if (originalJwtSecret === undefined) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = originalJwtSecret;
    }
    fs.rmSync(testDataDir, { recursive: true, force: true });
  });

  test('skips wifi import when encrypted password cannot be decrypted', () => {
    const db = getDb();
    const originalWifi = {
      ssid: 'OriginalSSID',
      password: 'OriginalPass123!',
      channel: 6,
      band: '2.4GHz',
      hidden: false,
      maxClients: 10,
      interface: 'wlan0',
    };

    db.prepare("INSERT OR REPLACE INTO system_config (key, value, updated_at) VALUES ('wifi_ap_config', ?, datetime('now'))")
      .run(JSON.stringify(originalWifi));

    const result = importConfig(
      {
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
          password_encrypted: 'not-a-valid-ciphertext',
          channel: 11,
          band: '2.4GHz',
          hidden: true,
          maxClients: 5,
          interface: 'wlan0',
        },
      },
      'actor-id',
      { sections: ['wifiConfig'], overwrite: true },
    );

    expect(result.imported).not.toContain('wifiConfig');
    expect(result.errors).toContain('wifiConfig: could not decrypt WiFi password (different server key?)');
    expect(result.errors).toContain('wifiConfig: missing or invalid WiFi password; import skipped to avoid insecure default fallback');

    const row = db.prepare("SELECT value FROM system_config WHERE key = 'wifi_ap_config'").get() as { value: string };
    const storedWifi = JSON.parse(row.value);
    expect(storedWifi.password).toBe('OriginalPass123!');
    expect(storedWifi.ssid).toBe('OriginalSSID');
  });
});
