# library-badges Spicetify installer
# One-liner: iwr -useb "https://raw.githubusercontent.com/daviidpaark/library-badges/main/install.ps1" | iex

$repoBaseUrl = "https://raw.githubusercontent.com/daviidpaark/library-badges/main"
$sourceFile  = "library-badges.user.js"
$extension   = "library-badges.js"

$ErrorActionPreference = "Stop"

# ── 1. Verify spicetify is installed ────────────────────────────────────────
if (-not (Get-Command spicetify -ErrorAction SilentlyContinue)) {
    Write-Error "spicetify not found in PATH. Install it from https://spicetify.app first."
    exit 1
}

$spiceConfigPath = & spicetify -c 2>$null
if ($spiceConfigPath -and (Test-Path $spiceConfigPath)) {
    $spicePath  = Split-Path $spiceConfigPath -Parent
    $configFile = $spiceConfigPath
} else {
    $spicePath  = "$env:APPDATA\spicetify"
    $configFile = "$spicePath\config-xpui.ini"
}

if (-not (Test-Path $configFile)) {
    Write-Error "config-xpui.ini not found at $configFile. Run 'spicetify backup' first."
    exit 1
}

# ── 2. Copy/download the extension ──────────────────────────────────────────
$destDir  = Join-Path $spicePath "Extensions"
$dest     = Join-Path $destDir $extension
$localSrc = if ($PSScriptRoot) { Join-Path $PSScriptRoot $sourceFile } else { $null }
New-Item -ItemType Directory -Path $destDir -Force | Out-Null

Write-Host "Installing $extension..." -ForegroundColor Cyan
if ($localSrc -and (Test-Path $localSrc)) {
    Copy-Item $localSrc $dest -Force
    Write-Host "  Copied to $dest" -ForegroundColor Green
} else {
    Invoke-WebRequest -Uri "$repoBaseUrl/$sourceFile" -OutFile $dest -UseBasicParsing
    Write-Host "  Downloaded to $dest" -ForegroundColor Green
}

# ── 3. Register the extension in config-xpui.ini ────────────────────────────
spicetify config extensions $extension

# ── 4. Apply ────────────────────────────────────────────────────────────────
Write-Host "`nApplying spicetify..." -ForegroundColor Cyan
spicetify apply
Write-Host "`nDone! Restart Spotify if it's already open." -ForegroundColor Green
