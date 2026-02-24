# SwimEx EDGE Server — Windows Installer
# Run as Administrator

$ErrorActionPreference = "Stop"
$InstallDir = "C:\SwimEx\EDGE"
$DataDir = "C:\SwimEx\data"
$ConfigDir = "C:\SwimEx\config"
$ServiceName = "SwimExEDGE"

Write-Host "========================================"
Write-Host " SwimEx EDGE Server - Windows Installer"
Write-Host "========================================"

# Check Node.js
$nodeVersion = & node -v 2>$null
if (-not $nodeVersion) {
    Write-Host "ERROR: Node.js is required. Download from https://nodejs.org" -ForegroundColor Red
    exit 1
}
Write-Host "Node.js $nodeVersion found"

# Create directories
Write-Host "[1/5] Creating directories..."
New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
New-Item -ItemType Directory -Force -Path $DataDir | Out-Null
New-Item -ItemType Directory -Force -Path $ConfigDir | Out-Null

# Copy files
Write-Host "[2/5] Copying application files..."
Copy-Item -Recurse -Force "..\..\src" "$InstallDir\"
Copy-Item -Recurse -Force "..\..\public" "$InstallDir\"
Copy-Item -Force "..\..\package.json" "$InstallDir\"
Copy-Item -Force "..\..\package-lock.json" "$InstallDir\"
Copy-Item -Force "..\..\tsconfig.json" "$InstallDir\"
if (Test-Path "..\..\config\default.json") {
    Copy-Item -Force "..\..\config\default.json" "$ConfigDir\"
}

# Install deps
Write-Host "[3/5] Installing dependencies..."
Push-Location $InstallDir
& npm ci --production 2>$null
if ($LASTEXITCODE -ne 0) { & npm install --production }

# Build
Write-Host "[4/5] Building TypeScript..."
& npx tsc
Pop-Location

# Register as Windows Service using node-windows or NSSM
Write-Host "[5/5] Registering Windows service..."
Write-Host "To run as a Windows Service, use NSSM:"
Write-Host "  nssm install $ServiceName node $InstallDir\dist\app\index.js"
Write-Host "  nssm set $ServiceName AppDirectory $InstallDir"
Write-Host "  nssm set $ServiceName AppEnvironmentExtra HTTP_PORT=80 MQTT_PORT=1883 MODBUS_PORT=502 DATA_DIR=$DataDir CONFIG_DIR=$ConfigDir"
Write-Host "  nssm start $ServiceName"

Write-Host ""
Write-Host "========================================"
Write-Host " SwimEx EDGE Server - Installation Complete"
Write-Host "========================================"
Write-Host " Install Dir: $InstallDir"
Write-Host " Data Dir:    $DataDir"
Write-Host " Config Dir:  $ConfigDir"
Write-Host "========================================"
