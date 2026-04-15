import type { UsageRecord } from "../logger/usageLogger.js"
import { listRecentSessions } from "../context/sessionStore.js"
import type { SessionRecord } from "../context/sessionStore.js"

interface Stats {
  totalRequests: number
  totalInputTokens: number
  totalOutputTokens: number
  compressCount: number
  streamingRequests: number
  recentRecords: UsageRecord[]
}

function computeStats(records: UsageRecord[]): Stats {
  return {
    totalRequests: records.length,
    totalInputTokens: records.reduce((s, r) => s + r.inputTokens, 0),
    totalOutputTokens: records.reduce((s, r) => s + r.outputTokens, 0),
    compressCount: records.filter((r) => r.compressed).length,
    streamingRequests: records.filter((r) => r.inputTokens === 0).length,
    recentRecords: records.slice(-20).reverse(),
  }
}

function renderSessionRows(sessions: SessionRecord[]): string {
  if (sessions.length === 0) return '<tr><td colspan="4" class="empty">暂无 session 记录</td></tr>'
  return sessions
    .map((s) => {
      const files: string[] = JSON.parse(s.file_paths || "[]")
      const decisions: string[] = JSON.parse(s.key_decisions || "[]")
      const projectName = s.project_key.split("/").pop() ?? s.project_key
      return `<tr>
      <td title="${s.project_key}">${projectName}</td>
      <td>${new Date(s.ts).toLocaleString("ja-JP")}</td>
      <td style="max-width:360px;white-space:pre-wrap">${s.summary}</td>
      <td style="font-size:11px;color:#888">${files.join(", ") || "-"}</td>
    </tr>`
    })
    .join("")
}

export function renderDashboard(records: UsageRecord[]): string {
  const s = computeStats(records)
  const sessions = listRecentSessions(10)
  const rows = s.recentRecords
    .map(
      (r) => `
    <tr>
      <td>${new Date(r.ts).toLocaleString("ja-JP")}</td>
      <td>${r.model}</td>
      <td>${r.inputTokens > 0 ? r.inputTokens : "stream"}</td>
      <td>${r.outputTokens > 0 ? r.outputTokens : "stream"}</td>
      <td>${r.compressed ? `✓ (from ~${r.compressedFromTokens?.toFixed(0) ?? "?"})` : "-"}</td>
    </tr>`,
    )
    .join("")

  return `<!DOCTYPE html>
<html lang="zh">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>ModelBridge Dashboard</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #0f0f0f; color: #e5e5e5; padding: 32px; }
    h1 { font-size: 20px; font-weight: 600; margin-bottom: 24px; color: #fff; }
    .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 16px; margin-bottom: 32px; }
    .card { background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 8px; padding: 20px; }
    .card-label { font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
    .card-value { font-size: 28px; font-weight: 700; color: #fff; }
    .card-value.highlight { color: #4ade80; }
    table { width: 100%; border-collapse: collapse; background: #1a1a1a; border-radius: 8px; overflow: hidden; border: 1px solid #2a2a2a; }
    th { text-align: left; padding: 12px 16px; font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #2a2a2a; }
    td { padding: 12px 16px; font-size: 13px; border-bottom: 1px solid #1f1f1f; }
    tr:last-child td { border-bottom: none; }
    tr:hover td { background: #222; }
    .empty { text-align: center; padding: 48px; color: #444; font-size: 14px; }
    .refresh { font-size: 12px; color: #444; margin-bottom: 16px; }
  </style>
  <meta http-equiv="refresh" content="10">
</head>
<body>
  <h1>ModelBridge</h1>
  <p class="refresh">Claude Code → Kimi API · 每10秒自动刷新</p>

  <div class="cards">
    <div class="card">
      <div class="card-label">总请求数</div>
      <div class="card-value">${s.totalRequests}</div>
    </div>
    <div class="card">
      <div class="card-label">Input Tokens</div>
      <div class="card-value">${s.totalInputTokens.toLocaleString()}</div>
    </div>
    <div class="card">
      <div class="card-label">Output Tokens</div>
      <div class="card-value">${s.totalOutputTokens.toLocaleString()}</div>
    </div>
    <div class="card">
      <div class="card-label">压缩触发次数</div>
      <div class="card-value highlight">${s.compressCount}</div>
    </div>
    <div class="card">
      <div class="card-label">Streaming 请求</div>
      <div class="card-value">${s.streamingRequests}</div>
    </div>
  </div>

  ${
    s.recentRecords.length === 0
      ? '<div class="empty">暂无请求记录，等待 Claude Code 发起请求...</div>'
      : `<table>
    <thead>
      <tr>
        <th>时间</th>
        <th>Model</th>
        <th>Input Tokens</th>
        <th>Output Tokens</th>
        <th>压缩</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>`
  }

  <h2 style="font-size:16px;font-weight:600;margin:32px 0 16px;color:#fff">Session 记忆</h2>
  <table>
    <thead>
      <tr>
        <th>项目</th>
        <th>时间</th>
        <th>摘要</th>
        <th>文件</th>
      </tr>
    </thead>
    <tbody>${renderSessionRows(sessions)}</tbody>
  </table>
</body>
</html>`
}
