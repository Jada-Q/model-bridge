#!/bin/zsh
# One-click: start ModelBridge (if needed) + Claude Code with Kimi API

BRIDGE_DIR="$HOME/Desktop/projects/model-bridge"
KIMI_KEY=$(grep KIMI_API_KEY "$BRIDGE_DIR/.env" | cut -d= -f2)

# Start ModelBridge if not running
if ! curl -s localhost:8765/health > /dev/null 2>&1; then
  echo "Starting ModelBridge..."
  cd "$BRIDGE_DIR" && pnpm start > /tmp/modelbridge.log 2>&1 &
  sleep 2
  if ! curl -s localhost:8765/health > /dev/null 2>&1; then
    echo "ERROR: ModelBridge failed to start. Check /tmp/modelbridge.log"
    exit 1
  fi
fi

echo "✓ ModelBridge running → Kimi API connected"
echo "  Dashboard: http://localhost:8765/dashboard"
echo ""

# Launch Claude Code with Kimi
export ANTHROPIC_BASE_URL=http://localhost:8765
export ANTHROPIC_API_KEY="$KIMI_KEY"
export ENABLE_TOOL_SEARCH=false

exec claude "$@"
