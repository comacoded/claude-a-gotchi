#!/usr/bin/env bash
#
# Claude-a-gotchi installer — installs the extension into your editor.
# No Marketplace needed.
#
# One-liner:
#   curl -fsSL https://raw.githubusercontent.com/comacoded/claude-a-gotchi/main/install.sh | bash
#
# Or, if you have the .vsix locally, drop this script next to it and run ./install.sh
set -euo pipefail

RELEASE_VSIX="https://github.com/comacoded/claude-a-gotchi/releases/latest/download/claude-a-gotchi.vsix"

# Find a local .vsix next to this script (when run as a file), else download the release.
SELF="${BASH_SOURCE[0]:-}"
VSIX=""
TMP=""
if [ -n "$SELF" ] && [ -f "$SELF" ]; then
  HERE="$(cd "$(dirname "$SELF")" && pwd)"
  VSIX="$(ls -1 "$HERE"/claude-a-gotchi-*.vsix 2>/dev/null | sort -V | tail -1 || true)"
fi

if [ -z "$VSIX" ]; then
  echo "Downloading the latest Claude-a-gotchi build…"
  TMP="$(mktemp -d)"
  VSIX="$TMP/claude-a-gotchi.vsix"
  if ! curl -fsSL "$RELEASE_VSIX" -o "$VSIX"; then
    echo "✗ Couldn't download the release. Check your connection or grab the .vsix from:"
    echo "  https://github.com/comacoded/claude-a-gotchi/releases/latest"
    exit 1
  fi
fi

echo "Installing $(basename "$VSIX")…"
installed=0

try_cli() {
  local label="$1" bin="$2"
  if [ -n "$bin" ] && command -v "$bin" >/dev/null 2>&1; then
    if "$bin" --install-extension "$VSIX" --force >/dev/null 2>&1; then
      echo "  ✓ $label"
      installed=$((installed + 1))
    fi
  fi
}

try_cli "VS Code"  code
try_cli "Cursor"   cursor
try_cli "VSCodium" codium

[ -n "$TMP" ] && rm -rf "$TMP"

if [ "$installed" -eq 0 ]; then
  echo "✗ No supported editor CLI found (VS Code / Cursor / VSCodium)."
  echo "  In VS Code: Command Palette → 'Shell Command: Install code command in PATH', then re-run."
  exit 1
fi

echo "Done! Reload your editor window and click the Claude icon in the activity bar."
