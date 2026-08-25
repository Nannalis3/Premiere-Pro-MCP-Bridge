#!/bin/zsh
# One-time install for the Premiere Pro MCP bridge.
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"
EXT_ID="com.wazowski.pprobridge"
EXT_DST="$HOME/Library/Application Support/Adobe/CEP/extensions/$EXT_ID"

echo "1/3  Installing CEP panel -> $EXT_DST"
mkdir -p "$EXT_DST"
cp -R "$HERE/cep/$EXT_ID/"* "$EXT_DST/"

echo "2/3  Enabling unsigned CEP extensions (PlayerDebugMode)"
for v in 10 11 12; do
  defaults write com.adobe.CSXS.$v PlayerDebugMode 1
done
killall cfprefsd 2>/dev/null || true

echo "3/3  Creating bridge directory"
mkdir -p "$HOME/Documents/ppro-mcp-bridge"

echo ""
echo "Done. Next steps:"
echo "  1. (Re)start Premiere Pro"
echo "  2. Window > Extensions > MCP Bridge (PPRO)  — leave the panel open"
echo "  3. Test:  python3 $HERE/drive_ppro.py probe"
echo ""
echo "Register the MCP connector (user scope, all folders):"
echo "  claude mcp add -s user premiere-pro -- node $HERE/mcp/index.js"
