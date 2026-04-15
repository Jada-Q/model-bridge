import type { Request, Response } from "express"
import { CONFIG } from "../config.js"
import { mapModel } from "./modelMap.js"
import { pipeStream } from "./stream.js"
import { shouldCompress, compressContext, estimateTokens } from "../context/compressor.js"
import { logUsage } from "../logger/usageLogger.js"
import { extractProjectKey, injectContext } from "../context/contextInjector.js"
import { summarizeSession } from "../context/sessionSummarizer.js"

interface AnthropicMessage {
  role: string
  content: unknown
}

interface AnthropicRequestBody {
  model?: string
  messages?: AnthropicMessage[]
  stream?: boolean
  max_tokens?: number
  [key: string]: unknown
}

function getApiKey(_req: Request): string {
  // Always use the Kimi key from config — never trust the client's Authorization header
  // (Claude Code sends its own Anthropic OAuth token, which Kimi won't accept)
  return CONFIG.DEFAULT_KIMI_KEY
}

export async function handleMessages(req: Request, res: Response): Promise<void> {
  const body = req.body as AnthropicRequestBody
  const apiKey = getApiKey(req)
  const originalModel = body.model ?? "unknown"

  let messages = body.messages ?? []
  let compressed = false
  let compressedFromTokens: number | undefined

  // Session context injection (new session detection: only 1 user message so far)
  const isNewSession =
    messages.length === 1 && messages[0]?.role === "user"
  let sessionProjectKey: string | null = null

  if (isNewSession) {
    const systemPrompt = typeof body.system === "string" ? body.system : undefined
    sessionProjectKey = extractProjectKey(systemPrompt)
    if (sessionProjectKey) {
      const { messages: injected, injected: didInject } = injectContext(messages, sessionProjectKey)
      if (didInject) {
        messages = injected
        console.log(`[handler] Injected context for ${sessionProjectKey}`)
      }
    }
  }

  // Context compression check
  if (messages.length > 0 && shouldCompress(messages)) {
    compressedFromTokens = estimateTokens(messages)
    messages = await compressContext(messages, apiKey)
    compressed = true
  }

  // Build Kimi request
  const kimiBody = {
    ...body,
    model: mapModel(originalModel),
    messages,
  }

  let kimiRes: globalThis.Response
  try {
    kimiRes = await fetch(`${CONFIG.KIMI_BASE_URL}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(kimiBody),
    })
  } catch (err) {
    console.error("[handler] Fetch error:", err)
    res.status(502).json({ error: { type: "proxy_error", message: "Failed to reach Kimi API" } })
    return
  }

  if (!kimiRes.ok && !body.stream) {
    const errorBody = await kimiRes.json().catch(() => ({ error: "unknown" }))
    res.status(kimiRes.status).json(errorBody)
    return
  }

  if (body.stream) {
    pipeStream(kimiRes, res)
    // Log request count for streaming (token count unavailable without parsing SSE)
    logUsage({
      ts: new Date().toISOString(),
      model: originalModel,
      inputTokens: 0,
      outputTokens: 0,
      compressed,
      compressedFromTokens,
    })
    // Async summarize when session grows large enough
    if (sessionProjectKey && messages.length >= 6) {
      setImmediate(() => {
        summarizeSession(sessionProjectKey!, messages, apiKey).catch((err) =>
          console.error("[handler] summarize error:", err)
        )
      })
    }
    return
  }

  // Non-streaming: parse response and log usage
  const data = (await kimiRes.json()) as {
    usage?: { input_tokens?: number; output_tokens?: number; prompt_tokens?: number; completion_tokens?: number }
    [key: string]: unknown
  }

  const usage = data.usage ?? {}
  logUsage({
    ts: new Date().toISOString(),
    model: originalModel,
    inputTokens: usage.input_tokens ?? usage.prompt_tokens ?? 0,
    outputTokens: usage.output_tokens ?? usage.completion_tokens ?? 0,
    compressed,
    compressedFromTokens,
  })

  // Async summarize after non-streaming response when session is substantial
  if (sessionProjectKey && messages.length >= 6) {
    setImmediate(() => {
      summarizeSession(sessionProjectKey!, messages, apiKey).catch((err) =>
        console.error("[handler] summarize error:", err)
      )
    })
  }

  res.status(kimiRes.status).json(data)
}
