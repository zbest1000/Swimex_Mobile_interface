import { initDatabase, closeDatabase, getDb } from '../../src/database/connection';
import { runMigrations } from '../../src/database/migrate';
import * as configService from '../../src/admin/config-service';
import * as wifiService from '../../src/admin/wifi-service';

describe('ConfigService', () => {
  const testDataDir = '/tmp/edge-test-config-' + Date.now();

  beforeAll(() => {
    initDatabase(testDataDir);
    runMigrations();
  });

  afterAll(() => {
    closeDatabase();
  });

  test('skips WiFi import when encrypted password cannot be decrypted', () => {
    const db = getDb();
    const existingWifi = {
      ssid: 'ExistingPool',
      password: 'ExistingSecret123',
      channel: 6,
      band: '2.4GHz',
      hidden: false,
      maxClients: 10,
      interface: 'wlan0',
    };
    db.prepare("INSERT OR REPLACE INTO system_config (key, value, updated_at) VALUES ('wifi_ap_config', ?, datetime('now'))")
      .run(JSON.stringify(existingWifi));

    const result = configService.importConfig({
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
        ssid: 'ImportedPool',
        password_encrypted: 'not-valid-encrypted-data',
        channel: 11,
        band: '2.4GHz',
        hidden: true,
        maxClients: 5,
        interface: 'wlan0',
      },
    }, 'actor-1', { overwrite: true, sections: ['wifiConfig'] });

    expect(result.imported).not.toContain('wifiConfig');
    expect(result.skipped).toContain('wifiConfig');
    expect(result.errors).toContain('wifiConfig: could not decrypt WiFi password (different server key?)');
    expect(wifiService.getWifiConfig()).toEqual(existingWifi);
  });
});
