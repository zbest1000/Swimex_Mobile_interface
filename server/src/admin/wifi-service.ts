import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { config } from '../utils/config';
import { createLogger } from '../utils/logger';
import { auditLog } from '../auth/audit';
import { ValidationError } from '../utils/errors';
import { getDb } from '../database/connection';

const log = createLogger('wifi-service');

export interface WifiApConfig {
  ssid: string;
  password: string;
  channel: number;
  band: '2.4GHz';
  hidden: boolean;
  maxClients: number;
  interface: string;
}

const DEFAULT_WIFI_CONFIG: WifiApConfig = {
  ssid: 'PoolCtrl',
  password: 'swimex2024',
  channel: 6,
  band: '2.4GHz',
  hidden: false,
  maxClients: 10,
  interface: 'wlan0',
};

const VALID_CHANNELS_2_4GHZ = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const VALID_INTERFACE_RE = /^[a-zA-Z0-9_-]{1,15}$/;

function assertSafeInterface(iface: string): string {
  if (!VALID_INTERFACE_RE.test(iface)) {
    throw new ValidationError(`Unsafe interface name rejected: "${iface}"`);
  }
  return iface;
}

function assertSafeHostapdValue(value: string, fieldName: string): string {
  if (/[\n\r]/.test(value)) {
    throw new ValidationError(`${fieldName} must not contain newline characters`);
  }
  return value;
}

function getHostapdConfPath(): string {
  return path.join(config.configDir, 'hostapd.conf');
}

function getDnsmasqConfPath(): string {
  return path.join(config.configDir, 'dnsmasq.conf');
}

export function getWifiConfig(): WifiApConfig {
  const db = getDb();
  const row = db.prepare("SELECT value FROM system_config WHERE key = 'wifi_ap_config'").get() as { value: string } | undefined;
  if (row) {
    try {
      return { ...DEFAULT_WIFI_CONFIG, ...JSON.parse(row.value) };
    } catch {
      return { ...DEFAULT_WIFI_CONFIG };
    }
  }
  return { ...DEFAULT_WIFI_CONFIG };
}

export function updateWifiConfig(
  updates: Partial<Omit<WifiApConfig, 'band'>>,
  actorId: string,
): WifiApConfig {
  if (updates.ssid !== undefined) {
    if (!updates.ssid || updates.ssid.length > 32) {
      throw new ValidationError('SSID must be 1-32 characters');
    }
  }
  if (updates.password !== undefined) {
    if (updates.password.length < 8 || updates.password.length > 63) {
      throw new ValidationError('Password must be 8-63 characters');
    }
  }
  if (updates.channel !== undefined) {
    if (!VALID_CHANNELS_2_4GHZ.includes(updates.channel)) {
      throw new ValidationError(`Channel must be one of: ${VALID_CHANNELS_2_4GHZ.join(', ')}`);
    }
  }
  if (updates.maxClients !== undefined) {
    if (updates.maxClients < 1 || updates.maxClients > 50) {
      throw new ValidationError('Max clients must be between 1 and 50');
    }
  }
  if (updates.interface !== undefined) {
    if (!VALID_INTERFACE_RE.test(updates.interface)) {
      throw new ValidationError('Interface name must be alphanumeric (max 15 chars, e.g. wlan0)');
    }
  }

  const current = getWifiConfig();
  const updated: WifiApConfig = { ...current, ...updates, band: '2.4GHz' };

  const db = getDb();
  db.prepare(`
    INSERT OR REPLACE INTO system_config (key, value, updated_at) VALUES ('wifi_ap_config', ?, datetime('now'))
  `).run(JSON.stringify(updated));

  auditLog('WIFI_CONFIG_UPDATED', actorId, 'system', 'wifi', { updates });
  log.info('WiFi AP configuration updated', { ssid: updated.ssid, channel: updated.channel });

  return updated;
}

export function getWifiStatus(): {
  isRunning: boolean;
  ssid: string | null;
  channel: number | null;
  connectedClients: number;
  interface: string;
} {
  const cfg = getWifiConfig();
  let isRunning = false;
  let connectedClients = 0;

  try {
    const result = execSync('systemctl is-active hostapd', { timeout: 5000 }).toString().trim();
    isRunning = result === 'active';
  } catch {
    isRunning = false;
  }

  if (isRunning) {
    try {
      const iface = assertSafeInterface(cfg.interface);
      const stations = execSync(`iw dev ${iface} station dump 2>/dev/null | grep -c 'Station'`, { timeout: 5000 }).toString().trim();
      connectedClients = parseInt(stations, 10) || 0;
    } catch {
      connectedClients = 0;
    }
  }

  return {
    isRunning,
    ssid: isRunning ? cfg.ssid : null,
    channel: isRunning ? cfg.channel : null,
    connectedClients,
    interface: cfg.interface,
  };
}

function generateHostapdConf(cfg: WifiApConfig): string {
  const iface = assertSafeInterface(cfg.interface);
  const ssid = assertSafeHostapdValue(cfg.ssid, 'SSID');
  const pass = assertSafeHostapdValue(cfg.password, 'Password');

  return `# SwimEx EDGE WiFi AP Configuration (auto-generated)
interface=${iface}
driver=nl80211
ssid=${ssid}
hw_mode=g
channel=${cfg.channel}
wmm_enabled=0
macaddr_acl=0
auth_algs=1
ignore_broadcast_ssid=${cfg.hidden ? 1 : 0}
wpa=2
wpa_passphrase=${pass}
wpa_key_mgmt=WPA-PSK
wpa_pairwise=TKIP
rsn_pairwise=CCMP
max_num_sta=${cfg.maxClients}
`;
}

function generateDnsmasqConf(cfg: WifiApConfig): string {
  const iface = assertSafeInterface(cfg.interface);
  return `# SwimEx EDGE DHCP Configuration (auto-generated)
interface=${iface}
dhcp-range=192.168.4.2,192.168.4.20,255.255.255.0,24h
domain=local
address=/edge.local/192.168.4.1
`;
}

export function applyWifiConfig(actorId: string): { success: boolean; message: string } {
  const cfg = getWifiConfig();

  try {
    fs.mkdirSync(path.dirname(getHostapdConfPath()), { recursive: true });
    fs.writeFileSync(getHostapdConfPath(), generateHostapdConf(cfg), 'utf-8');
    fs.writeFileSync(getDnsmasqConfPath(), generateDnsmasqConf(cfg), 'utf-8');

    log.info('WiFi configuration files written');

    try {
      const iface = assertSafeInterface(cfg.interface);
      execSync(`ip addr add 192.168.4.1/24 dev ${iface} 2>/dev/null || true`, { timeout: 5000 });
      execSync(`ip link set ${iface} up`, { timeout: 5000 });
    } catch (err: any) {
      log.warn(`Network interface setup: ${err.message}`);
    }

    try {
      execSync(`hostapd -B ${getHostapdConfPath()}`, { timeout: 10000 });
    } catch (err: any) {
      log.warn(`hostapd start: ${err.message}`);
      return { success: false, message: `Failed to start hostapd: ${err.message}` };
    }

    try {
      execSync(`dnsmasq -C ${getDnsmasqConfPath()} --no-daemon &`, { timeout: 5000 });
    } catch (err: any) {
      log.warn(`dnsmasq start: ${err.message}`);
    }

    auditLog('WIFI_AP_STARTED', actorId, 'system', 'wifi', { ssid: cfg.ssid, channel: cfg.channel });
    log.info(`WiFi AP started: SSID="${cfg.ssid}" Channel=${cfg.channel}`);
    return { success: true, message: `WiFi AP started: SSID="${cfg.ssid}" on channel ${cfg.channel}` };
  } catch (err: any) {
    log.error('Failed to apply WiFi configuration', err.message);
    return { success: false, message: err.message };
  }
}

export function stopWifiAp(actorId: string): { success: boolean; message: string } {
  try {
    try { execSync('killall hostapd 2>/dev/null || true', { timeout: 5000 }); } catch { /* may not be running */ }
    try { execSync('killall dnsmasq 2>/dev/null || true', { timeout: 5000 }); } catch { /* may not be running */ }

    auditLog('WIFI_AP_STOPPED', actorId, 'system', 'wifi', {});
    log.info('WiFi AP stopped');
    return { success: true, message: 'WiFi AP stopped' };
  } catch (err: any) {
    log.error('Failed to stop WiFi AP', err.message);
    return { success: false, message: err.message };
  }
}
