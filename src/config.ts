import fs from "node:fs"
import path from "node:path"

// Load .env manually (no dotenv dependency)
const envPath = path.join(process.cwd(), ".env")
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const [key, ...rest] = line.split("=")
    if (key && rest.length) process.env[key.trim()] = rest.join("=").trim()
  }
}

export const CONFIG = {
  PORT: Number(process.env.PORT ?? 8765),
  KIMI_BASE_URL: "https://api.kimi.com/coding/v1",
  KIMI_MODEL: "kimi-for-coding",
  CONTEXT_COMPRESS_THRESHOLD: 40_000, // estimated tokens
  CONTEXT_KEEP_RECENT: 6,
  LOG_PATH: path.join(process.cwd(), "logs", "usage.jsonl"),
  DEFAULT_KIMI_KEY: process.env.KIMI_API_KEY ?? "",
}
