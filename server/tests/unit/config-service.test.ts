import { initDatabase, closeDatabase, getDb } from '../../src/database/connection';
import { runMigrations } from '../../src/database/migrate';
import { exportConfig, importConfig } from '../../src/admin/config-service';
import { encrypt } from '../../src/utils/crypto';

describe('ConfigService WiFi import security', () => {
  const testDataDir = '/tmp/edge-config-test-' + Date.now();

  beforeAll(() => {
    initDatabase(testDataDir);
    runMigrations();
  });

  afterAll(() => {
    closeDatabase();
  });

  test('imports wifi config when password_encrypted can be decrypted', () => {
    const db = getDb();
    const encrypted = encrypt('StrongPass123!');

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
          ssid: 'SecurePool',
          channel: 6,
          band: '2.4GHz',
          hidden: false,
          maxClients: 10,
          interface: 'wlan0',
          password_encrypted: encrypted,
        },
      },
      'system',
      { overwrite: true, sections: ['wifiConfig'] },
    );

    expect(result.errors).toHaveLength(0);
    expect(result.imported).toContain('wifiConfig');

    const row = db.prepare("SELECT value FROM system_config WHERE key = 'wifi_ap_config'").get() as { value: string } | undefined;
    expect(row).toBeDefined();

    const saved = JSON.parse(row!.value) as Record<string, unknown>;
    expect(saved.password).toBe('StrongPass123!');
    expect(saved.password_encrypted).toBeUndefined();
  });

  test('skips wifi config write when password_encrypted cannot be decrypted', () => {
    const db = getDb();
    db.prepare("INSERT OR REPLACE INTO system_config (key, value, updated_at) VALUES ('wifi_ap_config', ?, datetime('now'))")
      .run(JSON.stringify({
        ssid: 'OriginalSSID',
        password: 'OriginalPassword123!',
        channel: 11,
        band: '2.4GHz',
        hidden: false,
        maxClients: 10,
        interface: 'wlan0',
      }));

    const before = db.prepare("SELECT value FROM system_config WHERE key = 'wifi_ap_config'").get() as { value: string };

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
          ssid: 'NewSSID',
          channel: 1,
          band: '2.4GHz',
          hidden: false,
          maxClients: 5,
          interface: 'wlan0',
          password_encrypted: 'invalid-base64',
        },
      },
      'system',
      { overwrite: true, sections: ['wifiConfig'] },
    );

    expect(result.imported).not.toContain('wifiConfig');
    expect(result.skipped).toContain('wifiConfig');
    expect(result.errors.some((msg) => msg.includes('could not decrypt WiFi password'))).toBe(true);

    const after = db.prepare("SELECT value FROM system_config WHERE key = 'wifi_ap_config'").get() as { value: string };
    expect(after.value).toBe(before.value);
  });

  test('exported wifi config never includes plaintext password', () => {
    const db = getDb();
    db.prepare("INSERT OR REPLACE INTO system_config (key, value, updated_at) VALUES ('wifi_ap_config', ?, datetime('now'))")
      .run(JSON.stringify({
        ssid: 'NoLeakSSID',
        password: 'DoNotLeak123!',
        channel: 6,
        band: '2.4GHz',
        hidden: false,
        maxClients: 10,
        interface: 'wlan0',
      }));

    const exported = exportConfig();
    const wifi = exported.wifiConfig as Record<string, unknown>;

    expect(wifi.password).toBeUndefined();
    expect(typeof wifi.password_encrypted).toBe('string');
  });
});
