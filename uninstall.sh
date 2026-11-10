#!/usr/bin/env bash
# library-badges Spicetify uninstaller
# One-liner: curl -fsSL "https://raw.githubusercontent.com/daviidpaark/library-badges/main/uninstall.sh" | bash

set -euo pipefail

EXTENSION="library-badges.js"

if ! command -v spicetify &>/dev/null; then
  echo "Error: spicetify not found in PATH." >&2
  exit 1
fi

CONFIG_PATH="$(spicetify -c 2>/dev/null || true)"
if [[ -n "$CONFIG_PATH" && -f "$CONFIG_PATH" ]]; then
  SPICE_PATH="$(dirname "$CONFIG_PATH")"
else
  SPICE_PATH="${XDG_CONFIG_HOME:-$HOME/.config}/spicetify"
fi

# ── 1. Deregister from config-xpui.ini ──────────────────────────────────────
spicetify config extensions "$EXTENSION-"

# ── 2. Remove the extension file ────────────────────────────────────────────
dest="$SPICE_PATH/Extensions/$EXTENSION"
if [[ -f "$dest" ]]; then
  rm -f "$dest"
  echo "Removed $dest"
fi

# ── 3. Apply ────────────────────────────────────────────────────────────────
echo ""
echo "Applying spicetify..."
spicetify apply
echo ""
echo "Done! Restart Spotify if it's already open."
