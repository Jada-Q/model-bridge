import { CONFIG } from "../config.js"
import { upsertSession } from "./sessionStore.js"

interface Message {
  role: string
  content: unknown
}

interface SummaryResult {
  summary: string
  file_paths: string[]
  key_decisions: string[]
}

const SUMMARIZE_PROMPT = `You are a session summarizer for a developer AI assistant.
Given the conversation below, extract:
1. A 2-3 sentence summary of what was accomplished
2. A list of file paths that were created or modified (extract from code blocks, file paths mentioned, etc.)
3. A list of key decisions made (max 5, short phrases)

Respond in this exact JSON format (no markdown, no explanation):
{
  "summary": "...",
  "file_paths": ["path1", "path2"],
  "key_decisions": ["decision1", "decision2"]
}`

function messagesToText(messages: Message[]): string {
  return messages
    .map((m) => {
      const content = typeof m.content === "string" ? m.content : JSON.stringify(m.content)
      return `${m.role.toUpperCase()}: ${content.slice(0, 500)}`
    })
    .join("\n\n")
}

export async function summarizeSession(
  projectKey: string,
  messages: Message[],
  apiKey: string = CONFIG.DEFAULT_KIMI_KEY
): Promise<void> {
  if (messages.length < 3) return // too short to summarize

  const conversationText = messagesToText(messages)

  let result: globalThis.Response
  try {
    result = await fetch(`${CONFIG.KIMI_BASE_URL}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: CONFIG.KIMI_MODEL,
        max_tokens: 512,
        messages: [
          {
            role: "user",
            content: `${SUMMARIZE_PROMPT}\n\n<conversation>\n${conversationText}\n</conversation>`,
          },
        ],
      }),
    })
  } catch (err) {
    console.error("[summarizer] fetch error:", err)
    return
  }

  if (!result.ok) {
    console.error("[summarizer] API error:", result.status)
    return
  }

  const data = (await result.json()) as {
    content?: Array<{ type: string; text?: string }>
  }

  const text = data.content?.find((c) => c.type === "text")?.text ?? ""

  let parsed: SummaryResult
  try {
    parsed = JSON.parse(text) as SummaryResult
  } catch {
    // Fallback: store raw text as summary
    parsed = { summary: text.slice(0, 500), file_paths: [], key_decisions: [] }
  }

  upsertSession({
    project_key: projectKey,
    summary: parsed.summary ?? "",
    file_paths: JSON.stringify(parsed.file_paths ?? []),
    key_decisions: JSON.stringify(parsed.key_decisions ?? []),
    ts: new Date().toISOString(),
  })

  console.log(`[summarizer] Saved session for ${projectKey}`)
}
