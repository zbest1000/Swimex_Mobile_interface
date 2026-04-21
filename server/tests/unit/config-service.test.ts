import fs from 'fs';
import os from 'os';
import path from 'path';
import { initDatabase, closeDatabase, getDb } from '../../src/database/connection';
import { runMigrations } from '../../src/database/migrate';
import * as configService from '../../src/admin/config-service';

describe('ConfigService WiFi import safety', () => {
  const testDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'edge-config-import-'));

  beforeAll(() => {
    initDatabase(testDataDir);
    runMigrations();
  });

  afterAll(() => {
    closeDatabase();
    fs.rmSync(testDataDir, { recursive: true, force: true });
  });

  function seedWifiConfig(value: Record<string, unknown>): void {
    const db = getDb();
    db.prepare(
      "INSERT OR REPLACE INTO system_config (key, value, updated_at) VALUES ('wifi_ap_config', ?, datetime('now'))",
    ).run(JSON.stringify(value));
  }

  function getStoredWifiConfig(): Record<string, unknown> {
    const db = getDb();
    const row = db.prepare("SELECT value FROM system_config WHERE key = 'wifi_ap_config'").get() as { value: string };
    return JSON.parse(row.value);
  }

  test('does not overwrite WiFi config when encrypted password cannot be decrypted', () => {
    seedWifiConfig({
      ssid: 'PoolCtrl',
      password: 'OldStrongPass1!',
      channel: 6,
      band: '2.4GHz',
      hidden: false,
      maxClients: 10,
      interface: 'wlan0',
    });

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
        ssid: 'BrokenImport',
        channel: 11,
        band: '2.4GHz',
        hidden: true,
        maxClients: 12,
        interface: 'wlan0',
        password_encrypted: 'invalid-encrypted-payload',
      },
    }, 'actor-test');

    expect(result.errors).toContain('wifiConfig: could not decrypt WiFi password (different server key?)');
    expect(result.skipped).toContain('wifiConfig');

    const stored = getStoredWifiConfig();
    expect(stored.ssid).toBe('PoolCtrl');
    expect(stored.password).toBe('OldStrongPass1!');
  });

  test('preserves existing password when import payload omits password fields', () => {
    seedWifiConfig({
      ssid: 'PoolCtrl',
      password: 'PersistedPass2!',
      channel: 6,
      band: '2.4GHz',
      hidden: false,
      maxClients: 10,
      interface: 'wlan0',
    });

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
        ssid: 'UpdatedSsid',
        channel: 11,
        band: '2.4GHz',
        hidden: true,
        maxClients: 9,
        interface: 'wlan0',
      },
    }, 'actor-test');

    expect(result.errors).toHaveLength(0);
    expect(result.imported).toContain('wifiConfig');

    const stored = getStoredWifiConfig();
    expect(stored.ssid).toBe('UpdatedSsid');
    expect(stored.password).toBe('PersistedPass2!');
  });
});
