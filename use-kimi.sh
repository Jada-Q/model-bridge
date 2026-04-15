#!/bin/zsh
# Start Claude Code with Kimi API via ModelBridge
# Usage: source ~/Desktop/projects/model-bridge/use-kimi.sh

KIMI_KEY=$(grep KIMI_API_KEY ~/Desktop/projects/model-bridge/.env | cut -d= -f2)

export ANTHROPIC_BASE_URL=http://localhost:8765
export ANTHROPIC_API_KEY="$KIMI_KEY"
export ENABLE_TOOL_SEARCH=false

echo "✓ Pointing Claude Code → ModelBridge → Kimi"
echo "  ANTHROPIC_BASE_URL=$ANTHROPIC_BASE_URL"
echo "  ANTHROPIC_API_KEY=${KIMI_KEY:0:20}..."
echo ""
echo "Run: claude"
