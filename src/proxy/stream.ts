import { Readable } from "node:stream"
import type { Response } from "express"

export function pipeStream(kimiRes: globalThis.Response, res: Response): void {
  // Forward relevant headers from Kimi to client
  const forwardHeaders = ["content-type", "cache-control", "transfer-encoding", "x-request-id"]
  for (const header of forwardHeaders) {
    const value = kimiRes.headers.get(header)
    if (value) res.setHeader(header, value)
  }

  // Ensure SSE headers are set
  res.setHeader("Content-Type", "text/event-stream")
  res.setHeader("Cache-Control", "no-cache")
  res.setHeader("Connection", "keep-alive")

  res.status(kimiRes.status)

  if (!kimiRes.body) {
    res.end()
    return
  }

  // Web Streams API (fetch) → Node.js Writable Stream (Express res)
  const nodeStream = Readable.fromWeb(kimiRes.body as Parameters<typeof Readable.fromWeb>[0])

  nodeStream.pipe(res)

  nodeStream.on("error", (err) => {
    console.error("[stream] pipe error:", err.message)
    if (!res.headersSent) res.status(500).end()
    else res.end()
  })
}
