# library-badges Spicetify uninstaller
# One-liner: iwr -useb "https://raw.githubusercontent.com/daviidpaark/library-badges/main/uninstall.ps1" | iex

$extension = "library-badges.js"

$ErrorActionPreference = "Stop"

if (-not (Get-Command spicetify -ErrorAction SilentlyContinue)) {
    Write-Error "spicetify not found in PATH."
    exit 1
}

$spiceConfigPath = & spicetify -c 2>$null
if ($spiceConfigPath -and (Test-Path $spiceConfigPath)) {
    $spicePath = Split-Path $spiceConfigPath -Parent
} else {
    $spicePath = "$env:APPDATA\spicetify"
}

# ── 1. Deregister from config-xpui.ini ──────────────────────────────────────
spicetify config extensions "$extension-"

# ── 2. Remove the extension file ────────────────────────────────────────────
$dest = Join-Path $spicePath "Extensions\$extension"
if (Test-Path $dest) {
    Remove-Item $dest -Force
    Write-Host "Removed $dest" -ForegroundColor Cyan
} else {
    Write-Host "'$extension' not found, skipping." -ForegroundColor Yellow
}

# ── 3. Apply ────────────────────────────────────────────────────────────────
Write-Host "`nApplying spicetify..." -ForegroundColor Cyan
spicetify apply
Write-Host "`nDone! Restart Spotify if it's already open." -ForegroundColor Green
