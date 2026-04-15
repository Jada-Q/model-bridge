import { CONFIG } from "../config.js"

interface Message {
  role: string
  content: unknown
}

function contentToString(content: unknown): string {
  if (typeof content === "string") return content
  if (Array.isArray(content)) {
    return content
      .map((c: unknown) => (typeof c === "object" && c !== null && "text" in c ? (c as { text: string }).text : ""))
      .join(" ")
  }
  return JSON.stringify(content)
}

export function estimateTokens(messages: Message[]): number {
  return messages.reduce((sum, m) => sum + contentToString(m.content).length / 4, 0)
}

export function shouldCompress(messages: Message[]): boolean {
  return estimateTokens(messages) > CONFIG.CONTEXT_COMPRESS_THRESHOLD
}

export async function compressContext(messages: Message[], apiKey: string): Promise<Message[]> {
  // Keep system message separate
  const systemMessages = messages.filter((m) => m.role === "system")
  const nonSystem = messages.filter((m) => m.role !== "system")

  const recent = nonSystem.slice(-CONFIG.CONTEXT_KEEP_RECENT)
  const old = nonSystem.slice(0, -CONFIG.CONTEXT_KEEP_RECENT)

  if (old.length === 0) return messages

  console.log(`[compressor] Compressing ${old.length} old messages (keeping ${recent.length} recent)...`)

  const summaryRes = await fetch(`${CONFIG.KIMI_BASE_URL}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: CONFIG.KIMI_MODEL,
      max_tokens: 1024,
      stream: false,
      messages: [
        ...old,
        {
          role: "user",
          content:
            "请用简洁的中文总结以上对话的关键内容、已完成的工作和重要结论，作为后续对话的背景。不超过500字。",
        },
      ],
    }),
  })

  if (!summaryRes.ok) {
    console.error("[compressor] Summary request failed, skipping compression")
    return messages
  }

  const summaryData = (await summaryRes.json()) as { content?: Array<{ text?: string }> }
  const summary = summaryData.content?.[0]?.text ?? "（历史对话摘要不可用）"

  const compressed: Message[] = [
    ...systemMessages,
    { role: "user", content: `【历史对话摘要】\n${summary}` },
    { role: "assistant", content: "好的，我已了解背景，继续为你服务。" },
    ...recent,
  ]

  console.log(
    `[compressor] Compressed: ${estimateTokens(messages).toFixed(0)} → ${estimateTokens(compressed).toFixed(0)} estimated tokens`,
  )

  return compressed
}
