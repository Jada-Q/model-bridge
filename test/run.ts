/**
 * ModelBridge automated test suite
 * Tests: sessionStore, contextInjector, proxy health, context injection e2e
 */
import assert from "node:assert/strict"
import { CONFIG } from "../src/config.js"
import { upsertSession, getLatestSession, listRecentSessions } from "../src/context/sessionStore.js"
import { extractProjectKey, injectContext } from "../src/context/contextInjector.js"

let passed = 0
let failed = 0

function test(name: string, fn: () => void) {
  try {
    fn()
    console.log(`  ✓ ${name}`)
    passed++
  } catch (err) {
    console.log(`  ✗ ${name}`)
    console.log(`    ${(err as Error).message}`)
    failed++
  }
}

async function testAsync(name: string, fn: () => Promise<void>) {
  try {
    await fn()
    console.log(`  ✓ ${name}`)
    passed++
  } catch (err) {
    console.log(`  ✗ ${name}`)
    console.log(`    ${(err as Error).message}`)
    failed++
  }
}

// ─── 1. sessionStore ──────────────────────────────────────────────────────────
console.log("\n[1] sessionStore")

const TEST_KEY = `/test/proj-${Date.now()}`

test("upsert and retrieve latest session", () => {
  upsertSession({
    project_key: TEST_KEY,
    summary: "Built login page",
    file_paths: JSON.stringify(["src/login.ts"]),
    key_decisions: JSON.stringify(["use JWT"]),
    ts: "2026-04-15T01:00:00.000Z",
  })
  const r = getLatestSession(TEST_KEY)
  assert.equal(r?.summary, "Built login page")
  assert.equal(r?.project_key, TEST_KEY)
})

test("returns null for unknown project", () => {
  const r = getLatestSession("/nonexistent/project")
  assert.equal(r, null)
})

test("returns most recent when multiple entries exist", () => {
  upsertSession({
    project_key: TEST_KEY,
    summary: "Added dashboard",
    file_paths: "[]",
    key_decisions: "[]",
    ts: "2026-04-15T02:00:00.000Z",
  })
  const r = getLatestSession(TEST_KEY)
  assert.equal(r?.summary, "Added dashboard")
})

test("listRecentSessions returns records in desc order", () => {
  const list = listRecentSessions(5)
  assert.ok(list.length >= 2)
  assert.ok(list[0].ts >= list[1].ts)
})

// ─── 2. contextInjector ───────────────────────────────────────────────────────
console.log("\n[2] contextInjector")

test("extractProjectKey from working_directory tag", () => {
  const sys = "<env>\n<working_directory>/Users/jada/projects/foo</working_directory>\n</env>"
  assert.equal(extractProjectKey(sys), "/Users/jada/projects/foo")
})

test("extractProjectKey returns null when tag absent", () => {
  assert.equal(extractProjectKey("no tag here"), null)
})

test("extractProjectKey returns null for undefined", () => {
  assert.equal(extractProjectKey(undefined), null)
})

test("injectContext skips when no prior session", () => {
  const msgs = [{ role: "user", content: "hello" }]
  const { messages, injected } = injectContext(msgs, "/unknown/project")
  assert.equal(injected, false)
  assert.equal(messages.length, 1)
})

test("injectContext prepends context when prior session exists", () => {
  const msgs = [{ role: "user", content: "continue please" }]
  const { messages, injected } = injectContext(msgs, "/test/proj-a")
  assert.equal(injected, true)
  assert.equal(messages.length, 3)
  assert.equal(messages[0].role, "user")
  assert.ok((messages[0].content as string).includes("Added dashboard"))
  assert.equal(messages[1].role, "assistant")
  assert.equal(messages[2].content, "continue please")
})

test("injectContext includes file paths in injected message", () => {
  upsertSession({
    project_key: "/test/proj-b",
    summary: "Fixed auth bug",
    file_paths: JSON.stringify(["src/auth.ts", "src/middleware.ts"]),
    key_decisions: "[]",
    ts: new Date().toISOString(),
  })
  const { messages } = injectContext([{ role: "user", content: "hi" }], "/test/proj-b")
  const contextText = messages[0].content as string
  assert.ok(contextText.includes("src/auth.ts"))
})

// ─── 3. Live server ───────────────────────────────────────────────────────────
async function runLiveTests() {
  console.log("\n[3] live server (localhost:8765)")

  await testAsync("health endpoint returns ok", async () => {
    const res = await fetch("http://localhost:8765/health")
    assert.equal(res.status, 200)
    const body = (await res.json()) as { status: string }
    assert.equal(body.status, "ok")
  })

  await testAsync("dashboard returns HTML with Session section", async () => {
    const res = await fetch("http://localhost:8765/dashboard")
    assert.equal(res.status, 200)
    const html = await res.text()
    assert.ok(html.includes("ModelBridge"))
    assert.ok(html.includes("Session"))
  })

  await testAsync("/v1/models returns model list", async () => {
    const res = await fetch("http://localhost:8765/v1/models", {
      headers: { Authorization: "Bearer test" },
    })
    assert.equal(res.status, 200)
    const body = (await res.json()) as { data: unknown[] }
    assert.ok(Array.isArray(body.data))
    assert.ok(body.data.length > 0)
  })

  await testAsync("POST /v1/messages proxies to Kimi and returns content", async () => {
    const key = CONFIG.DEFAULT_KIMI_KEY
    assert.ok(key.length > 0, "KIMI_API_KEY not set in env")
    const res = await fetch("http://localhost:8765/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 20,
        messages: [{ role: "user", content: "Reply with the single word: PONG" }],
      }),
    })
    assert.equal(res.status, 200)
    const body = (await res.json()) as { content: Array<{ type: string; text: string }> }
    const text = body.content?.find((c) => c.type === "text")?.text ?? ""
    assert.ok(text.length > 0, `empty response: ${JSON.stringify(body)}`)
    console.log(`    response: "${text.trim()}"`)
  })

  await testAsync("context injection: new session with known project gets injected", async () => {
    const key = CONFIG.DEFAULT_KIMI_KEY
    const res = await fetch("http://localhost:8765/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 40,
        system: "<env>\n<working_directory>/test/proj-a</working_directory>\n</env>",
        messages: [{ role: "user", content: "In one sentence: what did we do last session?" }],
      }),
    })
    assert.equal(res.status, 200)
    const body = (await res.json()) as { content: Array<{ type: string; text: string }> }
    const text = body.content?.find((c) => c.type === "text")?.text ?? ""
    assert.ok(text.length > 0)
    console.log(`    response: "${text.trim().slice(0, 100)}"`)
  })

  // ─── Summary ────────────────────────────────────────────────────────────────
  console.log(`\n${"─".repeat(40)}`)
  console.log(`  ${passed} passed  ${failed > 0 ? `${failed} FAILED` : ""}`)
  if (failed > 0) process.exit(1)
}

runLiveTests().catch((err) => {
  console.error("Test runner error:", err)
  process.exit(1)
})
