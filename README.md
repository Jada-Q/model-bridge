# ModelBridge

> Use Claude Code with Kimi API — save cost, keep context across sessions.

Claude Code → ModelBridge (localhost:8765) → Kimi API

---

## What it does

| Feature | Detail |
|---|---|
| **API routing** | Transparently forwards Claude Code requests to Kimi API |
| **Session memory** | Auto-summarizes each session; injects summary on next session start |
| **Context compression** | Reduces token usage when conversation exceeds 40k tokens |
| **Dashboard** | Live usage stats + session history at `/dashboard` |

---

## Prerequisites

- Node.js 22+
- pnpm (`npm i -g pnpm`)
- [Kimi Code](https://kimi.com/code) subscription + API key
- Claude Code CLI (`npm i -g @anthropic-ai/claude-code`)

---

## Setup

**1. Install dependencies**

```bash
git clone https://github.com/Jada-Q/model-bridge
cd model-bridge
pnpm install
```

> If you see a warning about `better-sqlite3` build scripts, run:
> ```bash
> cd node_modules/.pnpm/better-sqlite3@*/node_modules/better-sqlite3
> npm run build-release
> ```

**2. Add your Kimi API key**

```bash
cp .env.example .env
# Edit .env — set KIMI_API_KEY=sk-kimi-your-key
```

**3. Add the alias to your shell**

```bash
echo 'alias kimi="~/Desktop/projects/model-bridge/kimi.sh"' >> ~/.zshrc
source ~/.zshrc
```

---

## Usage

### One-click launch

```bash
kimi
```

This starts ModelBridge (if not already running) and opens Claude Code connected to Kimi API.

### Switch back to Anthropic API

```bash
claude-real
```

Add to `~/.zshrc`:
```bash
alias claude-real="ANTHROPIC_BASE_URL='' ANTHROPIC_API_KEY='' ENABLE_TOOL_SEARCH='' claude"
```

---

## Session Memory

ModelBridge automatically:

1. **Detects new sessions** — when Claude Code starts fresh (no prior messages)
2. **Injects previous context** — prepends last session's summary before your first message
3. **Saves session summary** — after 6+ exchanges, calls Kimi API to summarize and stores locally

Summary includes: what was done, files touched, key decisions made.

Storage: `data/sessions.db` (SQLite, local only, not synced)

---

## Dashboard

Open [http://localhost:8765/dashboard](http://localhost:8765/dashboard) while ModelBridge is running.

Shows:
- Total requests, input/output tokens
- Context compression count
- Recent request log
- Session memory history per project

---

## Manual start (without alias)

```bash
# Terminal 1 — start ModelBridge
pnpm start

# Terminal 2 — start Claude Code with Kimi
export ANTHROPIC_BASE_URL=http://localhost:8765
export ANTHROPIC_API_KEY=sk-kimi-your-key
export ENABLE_TOOL_SEARCH=false
claude
```

---

## Configuration

`.env` options:

```bash
KIMI_API_KEY=sk-kimi-your-key   # required
PORT=8765                        # optional, default 8765
```

`src/config.ts` constants:

| Key | Default | Description |
|---|---|---|
| `CONTEXT_COMPRESS_THRESHOLD` | 40000 | Token count to trigger compression |
| `CONTEXT_KEEP_RECENT` | 6 | Messages to keep after compression |

---

## Tech stack

- Node.js 22 + TypeScript + Express
- Kimi API: `https://api.kimi.com/coding/v1` (Anthropic-compatible protocol)
- SQLite via `better-sqlite3` for session storage
- No external services — fully local
