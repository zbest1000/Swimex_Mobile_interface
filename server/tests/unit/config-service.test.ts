import fs from 'fs';
import path from 'path';
import { initDatabase, closeDatabase, getDb } from '../../src/database/connection';
import { runMigrations } from '../../src/database/migrate';
import { importConfig, ServerConfigExport } from '../../src/admin/config-service';

describe('ConfigService', () => {
  const testDataDir = path.join('/tmp', `edge-config-test-${Date.now()}`);

  beforeAll(() => {
    initDatabase(testDataDir);
    runMigrations();
  });

  afterAll(() => {
    closeDatabase();
    fs.rmSync(testDataDir, { recursive: true, force: true });
  });

  test('skips wifi import when encrypted password cannot be decrypted', () => {
    const db = getDb();
    db.prepare(`
      INSERT OR REPLACE INTO system_config (key, value, updated_at)
      VALUES ('wifi_ap_config', ?, datetime('now'))
    `).run(JSON.stringify({
      ssid: 'OriginalSSID',
      password: 'OriginalPass123!',
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
        channel: 11,
        band: '2.4GHz',
        hidden: false,
        maxClients: 10,
        interface: 'wlan0',
        password_encrypted: 'invalid-encrypted-data',
      },
    };

    const result = importConfig(payload, 'test-actor-id', { overwrite: true, sections: ['wifiConfig'] });

    expect(result.imported).not.toContain('wifiConfig');
    expect(result.skipped).toContain('wifiConfig');
    expect(result.errors).toEqual(expect.arrayContaining([
      expect.stringContaining('could not decrypt WiFi password'),
      expect.stringContaining('missing WiFi password'),
    ]));

    const row = db.prepare("SELECT value FROM system_config WHERE key = 'wifi_ap_config'").get() as { value: string };
    const stored = JSON.parse(row.value) as Record<string, unknown>;

    expect(stored.ssid).toBe('OriginalSSID');
    expect(stored.password).toBe('OriginalPass123!');
    expect(stored.channel).toBe(6);
  });
});
