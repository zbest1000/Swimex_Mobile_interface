# Cloud Agent Starter Skill — SwimEx EDGE

Use this skill when working on the SwimEx EDGE codebase for the first time, setting up the dev environment, running the server, testing changes, or debugging.

---

## 1. Repository Layout

| Path | What it is |
|---|---|
| `server/` | Node.js/TypeScript EDGE server (Express, SQLite, MQTT, Modbus) |
| `client/` | Android kiosk app (Kotlin/Gradle) — rarely edited from Cloud agents |
| `shared/` | Shared TypeScript models and protocol definitions |
| `docs/` | Full documentation tree |
| `setup.sh` | Native quick-setup script |
| `setup-docker.sh` | Docker quick-setup script |

---

## 2. Server Setup (Primary Workflow)

### Install dependencies

```bash
cd /workspace/server
npm install
```

### Build

```bash
npm run build        # compiles TS → dist/
```

### Run in dev mode (no build needed)

```bash
cd /workspace/server
export HTTP_PORT=3000 MQTT_PORT=11883 MODBUS_PORT=5020 \
       DATA_DIR=./data CONFIG_DIR=./config \
       ADMIN_USER=admin ADMIN_PASS=admin123 \
       LOG_LEVEL=info POOL_ID=default
mkdir -p data
npm run dev
```

The dev script runs `ts-node src/app/index.ts`.

### Run the built version

```bash
npm run build && npm start
```

### Verify the server is up

```bash
curl -s http://localhost:3000/api/health | head -c 200
```

Expect `{"success":true,"data":{"status":"healthy",...}}`.

### Environment variables reference

| Variable | Default | Notes |
|---|---|---|
| `HTTP_PORT` | `80` | Use `3000` if non-root |
| `MQTT_PORT` | `1883` | Use `11883` if non-root |
| `MODBUS_PORT` | `502` | Use `5020` if non-root |
| `DATA_DIR` | `./data` | SQLite DB directory |
| `CONFIG_DIR` | `./config` | JSON config directory |
| `JWT_SECRET` | dev default | Change in production |
| `ADMIN_USER` | `admin` | Seed admin username |
| `ADMIN_PASS` | `changeme` | Seed admin password |
| `LOG_LEVEL` | `info` | `debug` for verbose |
| `POOL_ID` | `default` | MQTT topic namespace |
| `MQTT_HOST` | `localhost` | Mosquitto broker host |

---

## 3. Default Login Credentials

| Role | Username | Password |
|---|---|---|
| Super Admin | `superadmin` | `superadmin` |
| Admin | `admin` | `admin123` |
| Swimmer | `swimmer` | `swimmer` |

The Admin and Swimmer accounts only exist after commissioning is complete. On a fresh DB, only `superadmin` exists.

---

## 4. Authentication Flow (for API Testing)

```bash
# Login — get a JWT
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"superadmin","password":"superadmin"}' | \
  python3 -c "import sys,json; print(json.load(sys.stdin)['data']['token'])")

# Use the token
curl -s http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

### Commissioning the system (required before Admin/User accounts work)

On a fresh database the system is UNCOMMISSIONED. The Super Admin must complete a 5-step wizard via API:

```bash
# Step 1: Set commissioning codes
curl -X POST http://localhost:3000/api/auth/commission/step1-codes \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"swimexCode":"A3F7K2-9BQ4M1-R8D2W6-5HN3J7","bscCode":"X1Y2Z3-A4B5C6-D7E8F9-G1H2J3"}'

# Step 2: Change Super Admin password + create Admin
curl -X POST http://localhost:3000/api/auth/commission/step2-accounts \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"superAdminNewPassword":"superadmin","adminUsername":"admin","adminPassword":"admin123","adminDisplayName":"Administrator"}'

# Step 3: Network config
curl -X POST http://localhost:3000/api/auth/commission/step3-network \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"wifiSsid":"PoolCtrl","wifiChannel":6}'

# Step 4: PLC config
curl -X POST http://localhost:3000/api/auth/commission/step4-plc \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"protocol":"MQTT"}'

# Step 5: Finalize
curl -X POST http://localhost:3000/api/auth/commission/step5-finalize \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"template":"modern"}'
```

After Step 5 the system is commissioned and user registration opens.

---

## 5. Feature Flags

Feature flags live in the `feature_flags` SQLite table, managed by `server/src/admin/feature-flag-service.ts`.

| Flag Key | Default | Description |
|---|---|---|
| `BLUETOOTH_ENABLED` | Off / hidden | Bluetooth client–server transport |

### Read flags via API

```bash
curl -s http://localhost:3000/api/admin/feature-flags \
  -H "Authorization: Bearer $TOKEN"
```

### Toggle a flag via API (Super Admin)

```bash
curl -X PUT http://localhost:3000/api/admin/feature-flags/BLUETOOTH_ENABLED \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"enabled":true,"visible":true}'
```

### Toggle a flag directly in SQLite (quick hack for dev)

```bash
cd /workspace/server
node -e "
const Database = require('better-sqlite3');
const db = new Database('data/edge.db');
db.prepare(\"UPDATE feature_flags SET is_enabled = 1, is_visible = 1 WHERE feature_key = 'BLUETOOTH_ENABLED'\").run();
console.log(db.prepare('SELECT * FROM feature_flags').all());
db.close();
"
```

---

## 6. Database

- **Engine:** SQLite via `better-sqlite3`
- **Location:** `server/data/edge.db` (created on first run)
- **Schema & migrations:** `server/src/database/migrate.ts`
- **Seed logic:** `server/src/database/seed.ts`
- **Run migrations standalone:** `cd server && npx ts-node src/database/migrate.ts`

### Quick DB inspection

```bash
cd /workspace/server
node -e "
const Database = require('better-sqlite3');
const db = new Database('data/edge.db');
console.log(db.prepare(\"SELECT name FROM sqlite_master WHERE type='table'\").all());
db.close();
"
```

### Reset to a clean state

```bash
rm -rf /workspace/server/data/edge.db
# Restart the server — migrations and seed run automatically
```

---

## 7. Testing by Codebase Area

### 7a. Unit tests

Test files live in `server/tests/unit/`:

- `auth.test.ts` — auth service and commissioning
- `workout.test.ts` — workout engine
- `tag-database.test.ts` — tag database

There is **no test runner in package.json yet**. To run them, install Jest first:

```bash
cd /workspace/server
npm install --save-dev jest ts-jest @types/jest
npx ts-jest config:init
npx jest
```

### 7b. HTTP / API testing

Start the server (see Section 2), then exercise routes with `curl`:

```bash
# Health
curl -s http://localhost:3000/api/health

# Auth
curl -s -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"superadmin","password":"superadmin"}'

# Workouts (after commissioning)
curl -s http://localhost:3000/api/workouts/programs \
  -H "Authorization: Bearer $TOKEN"

# Admin — users, devices, feature flags
curl -s http://localhost:3000/api/admin/users \
  -H "Authorization: Bearer $TOKEN"
```

### 7c. API route files

| Route prefix | File | Auth required |
|---|---|---|
| `/api/auth` | `server/src/http/routes/auth-routes.ts` | Partially |
| `/api/users` | `server/src/http/routes/user-routes.ts` | Yes |
| `/api/workouts` | `server/src/http/routes/workout-routes.ts` | Yes |
| `/api/admin` | `server/src/http/routes/admin-routes.ts` | Yes (Admin+) |
| `/api/graphics` | `server/src/http/routes/graphics-routes.ts` | Yes |
| `/api/health` | `server/src/http/server.ts` | No |

### 7d. Frontend / UI testing

Static HTML/JS/CSS lives in `server/public/`. After starting the server, open `http://localhost:3000` in a browser. The UI templates are in `server/templates/`.

### 7e. Docker testing

```bash
cd /workspace/server/docker
docker compose up -d --build
# UI at http://localhost, MQTT at localhost:1883
docker compose logs -f edge-server
docker compose down
```

---

## 8. Linting

The `lint` script is defined but ESLint is not installed:

```bash
cd /workspace/server
npm install --save-dev eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin
npm run lint
```

---

## 9. Build Verification Checklist

After making changes, run this sequence:

```bash
cd /workspace/server
npm run build                  # TypeScript compiles without errors
# npm run lint                 # (if ESLint is installed)
# npx jest                    # (if Jest is installed)
```

Then manually verify:

```bash
export HTTP_PORT=3000 MQTT_PORT=11883 MODBUS_PORT=5020 \
       DATA_DIR=./data CONFIG_DIR=./config LOG_LEVEL=debug
mkdir -p data
npm start &
sleep 3
curl -s http://localhost:3000/api/health
```

---

## 10. Common Gotchas

- **Port permissions:** Ports below 1024 require root. Use `HTTP_PORT=3000`, `MQTT_PORT=11883`, `MODBUS_PORT=5020` when running as a normal user.
- **MQTT broker not running:** The server tries to connect to Mosquitto in the background and retries. MQTT warnings on startup are normal when running without Docker/Mosquitto.
- **Fresh DB commissioning:** After a DB reset, you must complete the commissioning wizard (Section 4) before Admin/User logins work.
- **No `.env` file:** All config is via environment variables or `server/config/default.json`. No `.env` file is used.
- **Native dependencies:** `better-sqlite3`, `argon2`, and `sharp` have native C/C++ bindings. If `npm install` fails, ensure `build-essential`, `python3`, and `node-gyp` are available.

---

## 11. Keeping This Skill Up to Date

When you discover a new testing trick, workaround, or environment setup step that would save future agents time, add it here:

1. **New environment quirk?** Add it to Section 10 (Common Gotchas).
2. **New test workflow?** Add a subsection under Section 7 (Testing by Codebase Area).
3. **New feature flag?** Add a row to the table in Section 5.
4. **New API route group?** Add it to the table in Section 7c.
5. **New dependency or build step?** Update Section 2 (Server Setup).

Format additions the same way as existing content — short, concrete, copy-pasteable.
