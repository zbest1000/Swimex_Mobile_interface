import { closeDatabase, getDb, initDatabase } from '../../src/database/connection';
import { runMigrations } from '../../src/database/migrate';
import { importConfig, ServerConfigExport } from '../../src/admin/config-service';

describe('ConfigService WiFi import safety', () => {
  const testDataDir = `/tmp/edge-test-config-${Date.now()}`;

  beforeAll(() => {
    initDatabase(testDataDir);
    runMigrations();
  });

  afterAll(() => {
    closeDatabase();
  });

  function setWifiConfig(value: Record<string, unknown>): void {
    const db = getDb();
    db.prepare(
      "INSERT OR REPLACE INTO system_config (key, value, updated_at) VALUES ('wifi_ap_config', ?, datetime('now'))",
    ).run(JSON.stringify(value));
  }

  function getWifiConfigRow(): Record<string, unknown> | null {
    const db = getDb();
    const row = db.prepare("SELECT value FROM system_config WHERE key = 'wifi_ap_config'").get() as { value: string } | undefined;
    if (!row) return null;
    return JSON.parse(row.value) as Record<string, unknown>;
  }

  function buildImport(wifiConfig: Record<string, unknown> | null): ServerConfigExport {
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
      wifiConfig,
    };
  }

  test('skips WiFi import when encrypted password cannot be decrypted', () => {
    setWifiConfig({
      ssid: 'CurrentSSID',
      password: 'CurrentStrongPass1!',
      channel: 6,
      band: '2.4GHz',
      hidden: false,
      maxClients: 10,
      interface: 'wlan0',
    });

    const result = importConfig(
      buildImport({
        ssid: 'ImportedSSID',
        password_encrypted: 'not-a-valid-encrypted-blob',
        channel: 11,
        band: '2.4GHz',
        hidden: false,
        maxClients: 10,
        interface: 'wlan0',
      }),
      'test-actor',
      { sections: ['wifiConfig'], overwrite: true },
    );

    expect(result.imported).not.toContain('wifiConfig');
    expect(result.skipped).toContain('wifiConfig');
    expect(result.errors).toContain('wifiConfig: could not decrypt WiFi password (different server key?)');

    const persisted = getWifiConfigRow();
    expect(persisted?.ssid).toBe('CurrentSSID');
    expect(persisted?.password).toBe('CurrentStrongPass1!');
  });

  test('preserves existing WiFi password when imported config omits it', () => {
    setWifiConfig({
      ssid: 'CurrentSSID',
      password: 'CurrentStrongPass2!',
      channel: 6,
      band: '2.4GHz',
      hidden: false,
      maxClients: 10,
      interface: 'wlan0',
    });

    const result = importConfig(
      buildImport({
        ssid: 'MigratedSSID',
        channel: 11,
        band: '2.4GHz',
        hidden: true,
        maxClients: 15,
        interface: 'wlan0',
      }),
      'test-actor',
      { sections: ['wifiConfig'], overwrite: true },
    );

    expect(result.imported).toContain('wifiConfig');
    expect(result.errors).toHaveLength(0);

    const persisted = getWifiConfigRow();
    expect(persisted?.ssid).toBe('MigratedSSID');
    expect(persisted?.channel).toBe(11);
    expect(persisted?.hidden).toBe(true);
    expect(persisted?.maxClients).toBe(15);
    expect(persisted?.password).toBe('CurrentStrongPass2!');
  });

  test('rejects WiFi import that has no password material and no existing password', () => {
    const db = getDb();
    db.prepare("DELETE FROM system_config WHERE key = 'wifi_ap_config'").run();

    const result = importConfig(
      buildImport({
        ssid: 'NoPasswordSSID',
        channel: 1,
        band: '2.4GHz',
        hidden: false,
        maxClients: 10,
        interface: 'wlan0',
      }),
      'test-actor',
      { sections: ['wifiConfig'], overwrite: true },
    );

    expect(result.imported).not.toContain('wifiConfig');
    expect(result.skipped).toContain('wifiConfig');
    expect(result.errors).toContain('wifiConfig: missing WiFi password in import payload and no existing password to preserve');
    expect(getWifiConfigRow()).toBeNull();
  });
});
