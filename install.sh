#!/usr/bin/env bash
# library-badges Spicetify installer
# One-liner: curl -fsSL "https://raw.githubusercontent.com/daviidpaark/library-badges/main/install.sh" | bash

set -euo pipefail

REPO_BASE_URL="https://raw.githubusercontent.com/daviidpaark/library-badges/main"
SOURCE_FILE="library-badges.user.js"
EXTENSION="library-badges.js"

# ── 1. Verify spicetify is installed ────────────────────────────────────────
if ! command -v spicetify &>/dev/null; then
  echo "Error: spicetify not found in PATH. Install it from https://spicetify.app first." >&2
  exit 1
fi

CONFIG_PATH="$(spicetify -c 2>/dev/null || true)"
if [[ -n "$CONFIG_PATH" && -f "$CONFIG_PATH" ]]; then
  SPICE_PATH="$(dirname "$CONFIG_PATH")"
else
  SPICE_PATH="${XDG_CONFIG_HOME:-$HOME/.config}/spicetify"
fi

CONFIG_FILE="$SPICE_PATH/config-xpui.ini"

if [[ ! -f "$CONFIG_FILE" ]]; then
  echo "Error: config-xpui.ini not found at $CONFIG_FILE. Run 'spicetify backup' first." >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" 2>/dev/null && pwd)" || SCRIPT_DIR="."

# ── 2. Copy/download the extension ──────────────────────────────────────────
dest_dir="$SPICE_PATH/Extensions"
dest="$dest_dir/$EXTENSION"
mkdir -p "$dest_dir"

echo "Installing $EXTENSION..."
if [[ -f "$SCRIPT_DIR/$SOURCE_FILE" ]]; then
  cp "$SCRIPT_DIR/$SOURCE_FILE" "$dest"
  echo "  Copied to $dest"
else
  curl -fsSL "$REPO_BASE_URL/$SOURCE_FILE" -o "$dest"
  echo "  Downloaded to $dest"
fi

# ── 3. Register the extension in config-xpui.ini ────────────────────────────
spicetify config extensions "$EXTENSION"

# ── 4. Apply ────────────────────────────────────────────────────────────────
echo ""
echo "Applying spicetify..."
spicetify apply
echo ""
echo "Done! Restart Spotify if it's already open."
