import fs from "node:fs"
import path from "node:path"
import { CONFIG } from "../config.js"

export interface UsageRecord {
  ts: string
  model: string
  inputTokens: number
  outputTokens: number
  compressed: boolean
  compressedFromTokens?: number
}

// Ensure logs directory exists
const logsDir = path.dirname(CONFIG.LOG_PATH)
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true })

export function logUsage(record: UsageRecord): void {
  try {
    fs.appendFileSync(CONFIG.LOG_PATH, JSON.stringify(record) + "\n")
  } catch (err) {
    console.error("[logger] Failed to write log:", err)
  }
}

export function readAllRecords(): UsageRecord[] {
  try {
    if (!fs.existsSync(CONFIG.LOG_PATH)) return []
    return fs
      .readFileSync(CONFIG.LOG_PATH, "utf-8")
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line) as UsageRecord)
  } catch {
    return []
  }
}
