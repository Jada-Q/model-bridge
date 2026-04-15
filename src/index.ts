import express from "express"
import { CONFIG } from "./config.js"
import { handleMessages } from "./proxy/handler.js"
import { dashboardRouter } from "./dashboard/router.js"

const app = express()

app.use(express.json({ limit: "10mb" }))

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", proxy: "ModelBridge", target: CONFIG.KIMI_BASE_URL })
})

// Mock models endpoint (Claude Code may call this)
app.get("/v1/models", (_req, res) => {
  res.json({
    data: [
      { id: "claude-sonnet-4-5", object: "model" },
      { id: "claude-opus-4-5", object: "model" },
      { id: "kimi-for-coding", object: "model" },
    ],
  })
})

// Core proxy
app.post("/v1/messages", handleMessages)

// Dashboard
app.use("/dashboard", dashboardRouter)

// 404 fallback
app.use((req, res) => {
  console.warn(`[404] ${req.method} ${req.path}`)
  res.status(404).json({ error: { type: "not_found", message: `${req.method} ${req.path} not found` } })
})

app.listen(CONFIG.PORT, () => {
  console.log(`
  ╔══════════════════════════════════════╗
  ║         ModelBridge running          ║
  ╠══════════════════════════════════════╣
  ║  Proxy:     http://localhost:${CONFIG.PORT}  ║
  ║  Dashboard: http://localhost:${CONFIG.PORT}/dashboard ║
  ║  Target:    Kimi API                 ║
  ╚══════════════════════════════════════╝

  Configure Claude Code:
    export ANTHROPIC_BASE_URL=http://localhost:${CONFIG.PORT}
    export ANTHROPIC_API_KEY=${CONFIG.DEFAULT_KIMI_KEY ? CONFIG.DEFAULT_KIMI_KEY.slice(0, 20) + "..." : "sk-kimi-xxx"}
    export ENABLE_TOOL_SEARCH=false
  `)
})
