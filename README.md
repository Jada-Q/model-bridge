# ModelBridge

**Use Claude Code with Kimi API — auto session memory, 90% cost reduction.**

[![Node](https://img.shields.io/badge/node-22%2B-brightgreen)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![Tests](https://img.shields.io/badge/tests-15%20passed-brightgreen)](#)

```
Claude Code → ModelBridge (localhost:8765) → Kimi API
```

---

## The problem

Every Claude Code session starts from zero.

You spend 5–15 minutes re-explaining your project: what you're building, where you left off, which decisions you already made. Every single session.

On top of that, Claude Code costs $50–100/month. If you have a Kimi Code subscription sitting at 1% usage, that's a lot of money going nowhere.

## What ModelBridge does

**1. Session memory** — Automatically summarizes each conversation and injects it at the start of the next session. Claude Code knows where you left off without you saying a word.

**2. Cost optimization** — Routes all Claude Code requests to Kimi API. Kimi Code 200元/month plan covers what would cost $50–100/month on Anthropic.

**3. Zero workflow change** — Same `claude` command, same interface, same tools. ModelBridge runs invisibly in the background.

---

## Quickstart

```bash
# 1. Clone and install
git clone https://github.com/Jada-Q/model-bridge
cd model-bridge
pnpm install

# 2. Add your Kimi API key
cp .env.example .env
# Edit .env → KIMI_API_KEY=sk-kimi-your-key

# 3. Add the alias
echo 'alias kimi="~/Desktop/projects/model-bridge/kimi.sh"' >> ~/.zshrc
source ~/.zshrc

# 4. Launch
kimi
```

That's it. Claude Code opens, connected to Kimi API, with session memory enabled.

---

## How session memory works

```
Session 1:  you work on auth module
            → ModelBridge auto-generates summary after 6+ exchanges
            → stores: "Built JWT login, httpOnly cookies, src/auth.ts"

Session 2:  you type your first message
            → ModelBridge injects: [Previous session: Built JWT login...]
            → Claude Code responds with full context already loaded
```

No manual CLAUDE.md editing. No `/compact` commands. Fully automatic.

---

## Dashboard

Open [http://localhost:8765/dashboard](http://localhost:8765/dashboard) while running.

- Token usage per session
- Context compression events
- Session memory history per project

---

## Switch between Kimi and Anthropic

```bash
kimi          # Claude Code → Kimi API (cheap, with memory)
claude-real   # Claude Code → Anthropic API (original)
```

Add to `~/.zshrc`:
```bash
alias claude-real="ANTHROPIC_BASE_URL='' ANTHROPIC_API_KEY='' ENABLE_TOOL_SEARCH='' claude"
```

---

## Full setup

**Prerequisites:** Node.js 22+, pnpm, Kimi Code subscription, Claude Code CLI

**Install:**
```bash
pnpm install
```

> If `better-sqlite3` fails to load (native addon), build it manually:
> ```bash
> cd node_modules/.pnpm/better-sqlite3@*/node_modules/better-sqlite3
> npm run build-release
> ```

**Configure:**
```bash
cp .env.example .env
# Set KIMI_API_KEY=sk-kimi-your-key
```

**Run:**
```bash
pnpm start      # start proxy only
kimi            # start proxy + open Claude Code
```

---

## How it compares

| | Claude Code (default) | Claude Code + ModelBridge |
|---|---|---|
| API backend | Anthropic | Kimi |
| Monthly cost | $50–100 | ~$0 (uses Kimi subscription) |
| Session memory | Manual (CLAUDE.md) | Automatic |
| Cross-project isolation | Manual | Auto (by working directory) |
| Setup | None | 5 min |

---

## Architecture

```
src/
├── index.ts                 # Express server (port 8765)
├── config.ts                # .env loader
├── proxy/
│   ├── handler.ts           # Core: receive → inject → forward → summarize
│   ├── stream.ts            # SSE pipe (Web Streams → Node.js)
│   └── modelMap.ts          # claude-* → kimi-for-coding
├── context/
│   ├── sessionStore.ts      # SQLite CRUD (data/sessions.db)
│   ├── contextInjector.ts   # Extract project key, prepend context
│   ├── sessionSummarizer.ts # Kimi API → session summary
│   └── compressor.ts        # Token estimation + context compression
├── logger/
│   └── usageLogger.ts       # Append-only JSONL (logs/usage.jsonl)
└── dashboard/
    ├── router.ts
    └── template.ts          # Inline HTML dashboard
```

---

## Tests

```bash
pnpm test
```

15 test cases: session store, context injection, live proxy, end-to-end Kimi API call.

---

## License

MIT
