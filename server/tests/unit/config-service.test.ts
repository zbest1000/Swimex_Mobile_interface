import fs from 'fs';
import { closeDatabase, getDb, initDatabase } from '../../src/database/connection';
import { runMigrations } from '../../src/database/migrate';
import { exportConfig, importConfig, ServerConfigExport } from '../../src/admin/config-service';

function makeConfigExport(wifiConfig: Record<string, unknown> | null): ServerConfigExport {
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

function writeWifiConfig(value: Record<string, unknown>): void {
  const db = getDb();
  db.prepare(
    "INSERT OR REPLACE INTO system_config (key, value, updated_at) VALUES ('wifi_ap_config', ?, datetime('now'))",
  ).run(JSON.stringify(value));
}

function readWifiConfig(): Record<string, unknown> {
  const db = getDb();
  const row = db.prepare("SELECT value FROM system_config WHERE key = 'wifi_ap_config'").get() as { value: string };
  return JSON.parse(row.value) as Record<string, unknown>;
}

describe('ConfigService WiFi import', () => {
  const testDataDir = `/tmp/edge-config-test-${Date.now()}`;

  beforeAll(() => {
    initDatabase(testDataDir);
    runMigrations();
  });

  afterAll(() => {
    closeDatabase();
    fs.rmSync(testDataDir, { recursive: true, force: true });
  });

  test('skips wifi import when encrypted password cannot be decrypted', () => {
    writeWifiConfig({
      ssid: 'Existing-SSID',
      password: 'ExistingPass123!',
      channel: 6,
      band: '2.4GHz',
      hidden: false,
      maxClients: 10,
      interface: 'wlan0',
    });

    const invalidImport = makeConfigExport({
      ssid: 'Imported-SSID',
      channel: 11,
      band: '2.4GHz',
      hidden: false,
      maxClients: 8,
      interface: 'wlan0',
      password_encrypted: 'not-a-valid-encrypted-payload',
    });

    const result = importConfig(invalidImport, 'test-actor', { overwrite: true, sections: ['wifiConfig'] });

    expect(result.imported).not.toContain('wifiConfig');
    expect(result.skipped).toContain('wifiConfig');
    expect(result.errors).toContain('wifiConfig: could not decrypt WiFi password (different server key?)');

    const wifiAfter = readWifiConfig();
    expect(wifiAfter.ssid).toBe('Existing-SSID');
    expect(wifiAfter.password).toBe('ExistingPass123!');
  });

  test('imports wifi config when encrypted password can be decrypted', () => {
    writeWifiConfig({
      ssid: 'Source-SSID',
      password: 'SourcePass123!',
      channel: 1,
      band: '2.4GHz',
      hidden: false,
      maxClients: 6,
      interface: 'wlan0',
    });

    const exported = exportConfig();
    expect(exported.wifiConfig).toBeTruthy();
    expect((exported.wifiConfig as Record<string, unknown>).password).toBeUndefined();
    expect((exported.wifiConfig as Record<string, unknown>).password_encrypted).toBeDefined();

    writeWifiConfig({
      ssid: 'Old-SSID',
      password: 'OldPass123!',
      channel: 11,
      band: '2.4GHz',
      hidden: true,
      maxClients: 12,
      interface: 'wlan0',
    });

    const result = importConfig(makeConfigExport(exported.wifiConfig), 'test-actor', {
      overwrite: true,
      sections: ['wifiConfig'],
    });

    expect(result.errors).toEqual([]);
    expect(result.imported).toContain('wifiConfig');

    const wifiAfter = readWifiConfig();
    expect(wifiAfter.ssid).toBe('Source-SSID');
    expect(wifiAfter.password).toBe('SourcePass123!');
    expect(wifiAfter.password_encrypted).toBeUndefined();
  });
});
