import { initDatabase, closeDatabase, getDb } from '../../src/database/connection';
import { runMigrations } from '../../src/database/migrate';
import { importConfig, ServerConfigExport } from '../../src/admin/config-service';
import { getWifiConfigSafe } from '../../src/admin/wifi-service';

function configExport(wifiConfig: Record<string, unknown>): ServerConfigExport {
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

describe('ConfigService WiFi import', () => {
  const testDataDir = '/tmp/edge-test-config-' + Date.now();

  beforeAll(() => {
    initDatabase(testDataDir);
    runMigrations();
  });

  afterAll(() => {
    closeDatabase();
  });

  beforeEach(() => {
    const db = getDb();
    db.prepare("DELETE FROM system_config WHERE key = 'wifi_ap_config'").run();
    db.prepare(`
      INSERT INTO system_config (key, value, updated_at)
      VALUES ('wifi_ap_config', ?, datetime('now'))
    `).run(JSON.stringify({
      ssid: 'ExistingPool',
      password: 'ExistingPass123',
      channel: 6,
      band: '2.4GHz',
      hidden: false,
      maxClients: 10,
      interface: 'wlan0',
    }));
  });

  test('does not overwrite WiFi config when encrypted password cannot decrypt', () => {
    const result = importConfig(
      configExport({
        ssid: 'ImportedPool',
        password_encrypted: 'not-a-valid-encrypted-password',
        channel: 11,
      }),
      'actor1',
      { overwrite: true, sections: ['wifiConfig'] },
    );

    expect(result.imported).not.toContain('wifiConfig');
    expect(result.errors).toEqual([
      'wifiConfig: could not decrypt WiFi password (different server key?)',
    ]);

    const row = getDb().prepare("SELECT value FROM system_config WHERE key = 'wifi_ap_config'").get() as { value: string };
    expect(JSON.parse(row.value)).toMatchObject({
      ssid: 'ExistingPool',
      password: 'ExistingPass123',
      channel: 6,
    });
  });

  test('rejects malformed WiFi password instead of persisting a crashing config', () => {
    const result = importConfig(
      configExport({
        ssid: 'ImportedPool',
        password: null,
        channel: 1,
      }),
      'actor1',
      { overwrite: true, sections: ['wifiConfig'] },
    );

    expect(result.imported).not.toContain('wifiConfig');
    expect(result.errors).toEqual(['wifiConfig: WiFi password must be a string']);
    expect(() => getWifiConfigSafe()).not.toThrow();
    expect(getWifiConfigSafe()).toMatchObject({
      ssid: 'ExistingPool',
      hasPassword: true,
    });
  });
});
