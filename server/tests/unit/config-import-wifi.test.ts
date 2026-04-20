import fs from 'fs';
import path from 'path';
import { initDatabase, closeDatabase, getDb } from '../../src/database/connection';
import { runMigrations } from '../../src/database/migrate';
import { importConfig, ServerConfigExport } from '../../src/admin/config-service';
import { getWifiConfig } from '../../src/admin/wifi-service';

describe('WiFi config import', () => {
  const testDataDir = path.join('/tmp', `edge-config-import-test-${Date.now()}`);

  beforeAll(() => {
    fs.mkdirSync(testDataDir, { recursive: true });
    initDatabase(testDataDir);
    runMigrations();
  });

  afterAll(() => {
    closeDatabase();
  });

  test('does not downgrade WiFi password to default when encrypted password cannot be decrypted', () => {
    const db = getDb();
    db.prepare(`
      INSERT OR REPLACE INTO system_config (key, value, updated_at)
      VALUES ('wifi_ap_config', ?, datetime('now'))
    `).run(JSON.stringify({
      ssid: 'OriginalSSID',
      password: 'UltraSecret99!',
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
        password_encrypted: 'abc',
        channel: 11,
        band: '2.4GHz',
        hidden: true,
        maxClients: 8,
        interface: 'wlan0',
      },
    };

    const result = importConfig(payload, 'actor-1', { overwrite: true, sections: ['wifiConfig'] });

    expect(result.errors).toContain('wifiConfig: could not decrypt WiFi password (different server key?)');
    expect(getWifiConfig().password).toBe('UltraSecret99!');
  });
});
