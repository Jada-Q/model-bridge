import { getLatestSession } from "./sessionStore.js"

interface Message {
  role: string
  content: unknown
}

/**
 * Extract project key from Claude Code's system prompt.
 * Claude Code injects <working_directory>/path</working_directory> into the system prompt.
 */
export function extractProjectKey(systemPrompt: string | undefined): string | null {
  if (!systemPrompt) return null
  const match = systemPrompt.match(/<working_directory>(.*?)<\/working_directory>/s)
  if (match) return match[1].trim()
  // Fallback: look for "cwd:" pattern
  const cwdMatch = systemPrompt.match(/cwd:\s*([^\n]+)/)
  if (cwdMatch) return cwdMatch[1].trim()
  return null
}

/**
 * Inject previous session context as a synthetic assistant message
 * prepended before the user's first message.
 * Only injects when it's a new session (messages.length === 1).
 */
export function injectContext(
  messages: Message[],
  projectKey: string
): { messages: Message[]; injected: boolean } {
  const record = getLatestSession(projectKey)
  if (!record) return { messages, injected: false }

  const filePaths: string[] = JSON.parse(record.file_paths || "[]")
  const keyDecisions: string[] = JSON.parse(record.key_decisions || "[]")

  const contextLines: string[] = [
    `[Previous session context — ${record.ts}]`,
    `Summary: ${record.summary}`,
  ]
  if (filePaths.length > 0) {
    contextLines.push(`Files touched: ${filePaths.join(", ")}`)
  }
  if (keyDecisions.length > 0) {
    contextLines.push(`Key decisions: ${keyDecisions.join("; ")}`)
  }
  contextLines.push("[End of previous context]")

  const contextMessage: Message = {
    role: "user",
    content: contextLines.join("\n"),
  }

  // Insert synthetic context exchange before the real first message
  const injectedMessages: Message[] = [
    contextMessage,
    {
      role: "assistant",
      content: "Understood. I have the context from the previous session and will continue from there.",
    },
    ...messages,
  ]

  return { messages: injectedMessages, injected: true }
}
