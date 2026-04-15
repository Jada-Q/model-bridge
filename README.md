# ModelBridge

Local proxy: route Claude Code API requests to Kimi API.

把 Claude Code 的请求转发给 Kimi API，充分利用 Kimi Code 订阅额度。

## Setup

```bash
pnpm install

# Edit .env
cp .env.example .env
# KIMI_API_KEY=sk-kimi-your-key
```

## Run

```bash
pnpm dev     # development (hot reload)
pnpm start   # production
```

## Configure Claude Code

In a new terminal, set these before running `claude`:

```bash
export ANTHROPIC_BASE_URL=http://localhost:8765
export ANTHROPIC_API_KEY=sk-kimi-your-key
export ENABLE_TOOL_SEARCH=false
claude
```

Or add to `~/.zshrc` as a function:

```bash
function kimi-claude() {
  ANTHROPIC_BASE_URL=http://localhost:8765 \
  ANTHROPIC_API_KEY=$(grep KIMI_API_KEY ~/Desktop/projects/model-bridge/.env | cut -d= -f2) \
  ENABLE_TOOL_SEARCH=false \
  claude "$@"
}
```

## Dashboard

Open http://localhost:8765/dashboard — shows token usage and context compression stats.

## Tech

- Node.js 22 + TypeScript + Express
- Kimi API: `https://api.kimi.com/coding/v1` (Anthropic-compatible)
- Context compression: auto-triggered at 40k estimated tokens
- Usage log: `logs/usage.jsonl`
