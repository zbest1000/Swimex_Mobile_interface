import fs from 'fs';
import { initDatabase, closeDatabase, getDb } from '../../src/database/connection';
import { runMigrations } from '../../src/database/migrate';
import { exportConfig, importConfig } from '../../src/admin/config-service';
import * as cryptoUtil from '../../src/utils/crypto';

describe('ConfigService WiFi import safety', () => {
  const testDataDir = '/tmp/edge-test-config-' + Date.now();

  beforeAll(() => {
    initDatabase(testDataDir);
    runMigrations();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(() => {
    closeDatabase();
    fs.rmSync(testDataDir, { recursive: true, force: true });
  });

  test('does not overwrite WiFi config when encrypted password cannot be decrypted', () => {
    const db = getDb();
    const originalWifiConfig = {
      ssid: 'PoolCtrl',
      password: 'SuperSecret9',
      channel: 6,
      band: '2.4GHz',
      hidden: false,
      maxClients: 10,
      interface: 'wlan0',
    };

    db.prepare(
      "INSERT OR REPLACE INTO system_config (key, value, updated_at) VALUES ('wifi_ap_config', ?, datetime('now'))"
    ).run(JSON.stringify(originalWifiConfig));

    const exported = exportConfig();
    expect(exported.wifiConfig).toBeTruthy();
    expect((exported.wifiConfig as Record<string, unknown>).password).toBeUndefined();
    expect(typeof (exported.wifiConfig as Record<string, unknown>).password_encrypted).toBe('string');

    jest.spyOn(cryptoUtil, 'decrypt').mockReturnValue(null);

    const result = importConfig(exported, 'actor-1', { overwrite: true, sections: ['wifiConfig'] });

    expect(result.imported).not.toContain('wifiConfig');
    expect(result.skipped).toContain('wifiConfig');
    expect(result.errors.some((error) => error.includes('could not decrypt WiFi password'))).toBe(true);

    const row = db
      .prepare("SELECT value FROM system_config WHERE key = 'wifi_ap_config'")
      .get() as { value: string };
    const persisted = JSON.parse(row.value) as Record<string, unknown>;

    expect(persisted.password).toBe(originalWifiConfig.password);
    expect(persisted.ssid).toBe(originalWifiConfig.ssid);
  });
});
