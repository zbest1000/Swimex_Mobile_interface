import fs from 'fs';
import path from 'path';
import { initDatabase, closeDatabase, getDb } from '../../src/database/connection';
import { runMigrations } from '../../src/database/migrate';
import { importConfig, ServerConfigExport } from '../../src/admin/config-service';

describe('config-service wifi import safety', () => {
  const testDataDir = path.join('/tmp', `edge-config-test-${Date.now()}`);

  beforeAll(() => {
    initDatabase(testDataDir);
    runMigrations();
  });

  afterAll(() => {
    closeDatabase();
    fs.rmSync(testDataDir, { recursive: true, force: true });
  });

  beforeEach(() => {
    const db = getDb();
    db.prepare("DELETE FROM system_config WHERE key = 'wifi_ap_config'").run();
  });

  function makeImportData(passwordEncrypted: string): ServerConfigExport {
    return {
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
        maxClients: 8,
        interface: 'wlan0',
        password_encrypted: passwordEncrypted,
      },
    };
  }

  test('preserves existing WiFi password when encrypted import cannot be decrypted', () => {
    const db = getDb();
    db.prepare("INSERT OR REPLACE INTO system_config (key, value, updated_at) VALUES ('wifi_ap_config', ?, datetime('now'))")
      .run(JSON.stringify({
        ssid: 'CurrentSSID',
        password: 'CurrentStrongPass1!',
        channel: 6,
        band: '2.4GHz',
        hidden: false,
        maxClients: 10,
        interface: 'wlan0',
      }));

    const result = importConfig(makeImportData('invalid-ciphertext'), 'actor-1');

    expect(result.imported).toContain('wifiConfig');
    expect(result.errors).toEqual(expect.arrayContaining([
      expect.stringContaining('could not decrypt WiFi password'),
      expect.stringContaining('preserved existing password'),
    ]));

    const row = db.prepare("SELECT value FROM system_config WHERE key = 'wifi_ap_config'").get() as { value: string };
    const stored = JSON.parse(row.value);
    expect(stored.ssid).toBe('ImportedSSID');
    expect(stored.password).toBe('CurrentStrongPass1!');
  });

  test('skips WiFi import if password is missing and nothing can be preserved', () => {
    const db = getDb();

    const result = importConfig(makeImportData('invalid-ciphertext'), 'actor-2');

    expect(result.imported).not.toContain('wifiConfig');
    expect(result.skipped).toContain('wifiConfig');
    expect(result.errors).toEqual(expect.arrayContaining([
      expect.stringContaining('could not decrypt WiFi password'),
      expect.stringContaining('missing WiFi password and no existing password to preserve; skipping import'),
    ]));

    const row = db.prepare("SELECT value FROM system_config WHERE key = 'wifi_ap_config'").get() as { value: string } | undefined;
    expect(row).toBeUndefined();
  });
});
