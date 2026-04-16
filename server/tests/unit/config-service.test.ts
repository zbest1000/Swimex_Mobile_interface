import { initDatabase, closeDatabase, getDb } from '../../src/database/connection';
import { runMigrations } from '../../src/database/migrate';
import { importConfig, ServerConfigExport } from '../../src/admin/config-service';
import { encrypt } from '../../src/utils/crypto';

describe('ConfigService', () => {
  const testDataDir = `/tmp/edge-test-config-${Date.now()}`;

  beforeAll(() => {
    initDatabase(testDataDir);
    runMigrations();
  });

  afterAll(() => {
    closeDatabase();
  });

  test('keeps existing WiFi password when encrypted password cannot be decrypted', () => {
    const db = getDb();
    db.prepare(
      "INSERT OR REPLACE INTO system_config (key, value, updated_at) VALUES ('wifi_ap_config', ?, datetime('now'))"
    ).run(
      JSON.stringify({
        ssid: 'OriginalSSID',
        password: 'ExistingStrongPass1!',
        channel: 11,
        band: '2.4GHz',
        hidden: false,
        maxClients: 10,
        interface: 'wlan0',
      })
    );

    const encryptedWithCurrentKey = encrypt('ImportedPass999!');
    const wrongKeyEncrypted = `A${encryptedWithCurrentKey.slice(1)}`;

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
        hidden: true,
        maxClients: 12,
        interface: 'wlan0',
        password_encrypted: wrongKeyEncrypted,
      },
    };

    const result = importConfig(importPayload, 'test-actor', { overwrite: true, sections: ['wifiConfig'] });

    expect(result.errors).toContain('wifiConfig: could not decrypt WiFi password (different server key?)');
    expect(result.imported).not.toContain('wifiConfig');
    expect(result.skipped).toContain('wifiConfig');

    const row = db.prepare("SELECT value FROM system_config WHERE key = 'wifi_ap_config'").get() as { value: string };
    const persisted = JSON.parse(row.value) as Record<string, unknown>;

    expect(persisted.ssid).toBe('OriginalSSID');
    expect(persisted.password).toBe('ExistingStrongPass1!');
  });
});
