# SwimEx EDGE Server Configuration Reference

This document describes the configuration file format, environment variables, network interfaces, ports, TLS, database, logging, and feature flags for the EDGE Server.

## Config File Format

The primary configuration file is `edge.conf` (or `edge.yaml`). Location varies by platform:

| Platform | Default Path |
|----------|--------------|
| Linux | `/etc/swimex-edge/edge.conf` |
| Windows | `C:\ProgramData\SwimEx\EDGE\edge.conf` |
| Docker | `/app/config/edge.conf` or via volume mount |

Format: INI-style or YAML. Example INI:

```ini
[server]
host = 0.0.0.0
http_port = 80
https_port = 443

[mqtt]
enabled = true
port = 1883
tls_port = 8883

[modbus]
server_enabled = true
server_port = 502
client_enabled = true

[database]
path = /var/lib/swimex-edge/data/edge.db

[logging]
level = info
file = /var/log/swimex-edge/edge.log
```

Example YAML:

```yaml
server:
  host: 0.0.0.0
  http_port: 80
  https_port: 443

mqtt:
  enabled: true
  port: 1883
  tls_port: 8883

modbus:
  server_enabled: true
  server_port: 502
  client_enabled: true

database:
  path: /var/lib/swimex-edge/data/edge.db

logging:
  level: info
  file: /var/log/swimex-edge/edge.log
```

## Environment Variables

Environment variables override config file values. Prefix: `EDGE_`.

| Variable | Description | Example |
|----------|-------------|---------|
| `EDGE_CONFIG_PATH` | Path to config file | `/etc/swimex-edge/edge.conf` |
| `EDGE_DB_PATH` | Database file or directory | `/data/db` |
| `EDGE_HTTP_PORT` | HTTP listen port | `80` |
| `EDGE_HTTPS_PORT` | HTTPS listen port | `443` |
| `EDGE_MQTT_PORT` | MQTT plaintext port | `1883` |
| `EDGE_MQTT_TLS_PORT` | MQTT TLS port | `8883` |
| `EDGE_MODBUS_PORT` | Modbus TCP server port | `502` |
| `EDGE_LOG_LEVEL` | Logging level | `debug`, `info`, `warn`, `error` |
| `EDGE_TLS_CERT` | Path to TLS certificate | `/etc/ssl/certs/edge.pem` |
| `EDGE_TLS_KEY` | Path to TLS private key | `/etc/ssl/private/edge.key` |

## Network Interfaces

| Interface | Purpose | Typical Config |
|-----------|---------|----------------|
| **Ethernet** | PLC communication, Modbus TCP, MQTT from controllers | Static IP on industrial subnet |
| **Wi-Fi** | Client access, web app, Wi-Fi AP | DHCP or static; AP mode for tablets |

Configure via Admin UI or config file:

```ini
[network.ethernet]
interface = eth0
mode = static
address = 192.168.10.10
netmask = 255.255.255.0
gateway = 192.168.10.1

[network.wifi]
interface = wlan0
mode = ap
ssid = PoolCtrl
password = <encrypted>
channel = 6
dhcp_range = 192.168.20.100,192.168.20.200
```

## Ports Reference

| Port | Protocol | Default | Description |
|------|----------|---------|-------------|
| 80 | HTTP | Yes | Web application, REST API |
| 443 | HTTPS | Yes | TLS-secured web and API |
| 1883 | MQTT | Yes | MQTT plaintext |
| 8883 | MQTTS | Yes | MQTT over TLS |
| 502 | Modbus TCP | Yes | Modbus TCP server |

All ports are configurable. Ensure firewall rules allow required traffic.

## TLS Settings

| Setting | Description |
|---------|-------------|
| `tls.enabled` | Enable TLS for HTTPS and MQTTS |
| `tls.cert_file` | Path to certificate (PEM) |
| `tls.key_file` | Path to private key (PEM) |
| `tls.ca_file` | Optional CA bundle for client cert verification |
| `tls.min_version` | Minimum TLS version (e.g., 1.2) |

```ini
[tls]
enabled = true
cert_file = /etc/ssl/certs/edge.pem
key_file = /etc/ssl/private/edge.key
min_version = 1.2
```

## Database Location

| Platform | Default Path |
|----------|--------------|
| Linux | `/var/lib/swimex-edge/data/` |
| Windows | `C:\ProgramData\SwimEx\EDGE\data\` |
| Docker | `/data` (volume mount) |

The database stores:

- Configuration
- User accounts and permissions
- Tag definitions
- Audit logs
- Session data

For Docker, mount a persistent volume to `/data` to preserve data across restarts.

## Logging Levels

| Level | Description |
|-------|-------------|
| `debug` | Verbose; includes protocol traces |
| `info` | Normal operation; startup, connections, errors |
| `warn` | Warnings and recoverable issues |
| `error` | Errors only |

```ini
[logging]
level = info
file = /var/log/swimex-edge/edge.log
max_size_bytes = 10485760
max_files = 5
```

## Feature Flags

| Flag | Description | Default |
|------|-------------|---------|
| `features.mqtt_broker` | Enable built-in MQTT broker | `true` |
| `features.modbus_server` | Enable Modbus TCP server | `true` |
| `features.modbus_client` | Enable Modbus TCP client | `true` |
| `features.bluetooth` | Enable Bluetooth (Super Admin only) | `false` |
| `features.wifi_ap` | Enable Wi-Fi access point | `true` |
| `features.graphics_editor` | Enable built-in graphics editor | `true` |

```ini
[features]
mqtt_broker = true
modbus_server = true
modbus_client = true
bluetooth = false
wifi_ap = true
graphics_editor = true
```

## Config Precedence

1. Environment variables (highest)
2. Config file
3. Built-in defaults (lowest)
