import { closeDatabase, getDb, initDatabase } from '../../src/database/connection';
import { runMigrations } from '../../src/database/migrate';
import { importConfig, ServerConfigExport } from '../../src/admin/config-service';
import { getWifiConfig } from '../../src/admin/wifi-service';
import { encrypt } from '../../src/utils/crypto';

describe('Config import WiFi password handling', () => {
  const testDataDir = '/tmp/edge-config-import-test-' + Date.now();

  beforeAll(() => {
    initDatabase(testDataDir);
    runMigrations();
  });

  afterAll(() => {
    closeDatabase();
  });

  beforeEach(() => {
    const db = getDb();
    db.prepare(
      "INSERT OR REPLACE INTO system_config (key, value, updated_at) VALUES ('wifi_ap_config', ?, datetime('now'))"
    ).run(JSON.stringify({
      ssid: 'ExistingSSID',
      password: 'CurrentSecret9',
      channel: 6,
      band: '2.4GHz',
      hidden: false,
      maxClients: 10,
      interface: 'wlan0',
    }));
  });

  test('does not overwrite WiFi config when encrypted password cannot be decrypted', () => {
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
        password_encrypted: 'invalid-encrypted-value',
        channel: 11,
        band: '2.4GHz',
        hidden: false,
        maxClients: 5,
        interface: 'wlan0',
      },
    };

    const result = importConfig(payload, 'actor-id', { overwrite: true, sections: ['wifiConfig'] });
    const wifi = getWifiConfig();

    expect(result.imported).not.toContain('wifiConfig');
    expect(result.skipped).toContain('wifiConfig');
    expect(result.errors).toContain('wifiConfig: could not decrypt WiFi password (different server key?)');
    expect(wifi.password).toBe('CurrentSecret9');
    expect(wifi.ssid).toBe('ExistingSSID');
  });

  test('imports WiFi config when encrypted password can be decrypted', () => {
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
        password_encrypted: encrypt('ImportedSecret9'),
        channel: 11,
        band: '2.4GHz',
        hidden: false,
        maxClients: 5,
        interface: 'wlan0',
      },
    };

    const result = importConfig(payload, 'actor-id', { overwrite: true, sections: ['wifiConfig'] });
    const wifi = getWifiConfig();

    expect(result.errors).toHaveLength(0);
    expect(result.imported).toContain('wifiConfig');
    expect(wifi.password).toBe('ImportedSecret9');
    expect(wifi.ssid).toBe('ImportedSSID');
  });
});
