import Database from "better-sqlite3"
import path from "node:path"
import fs from "node:fs"

const DATA_DIR = path.resolve(process.cwd(), "data")
const DB_PATH = path.join(DATA_DIR, "sessions.db")

export interface SessionRecord {
  project_key: string
  summary: string
  file_paths: string
  key_decisions: string
  ts: string
}

let _db: Database.Database | null = null

function getDb(): Database.Database {
  if (_db) return _db
  fs.mkdirSync(DATA_DIR, { recursive: true })
  _db = new Database(DB_PATH)
  _db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      project_key TEXT NOT NULL,
      summary     TEXT NOT NULL,
      file_paths  TEXT NOT NULL DEFAULT '[]',
      key_decisions TEXT NOT NULL DEFAULT '[]',
      ts          TEXT NOT NULL,
      PRIMARY KEY (project_key, ts)
    );
    CREATE INDEX IF NOT EXISTS idx_sessions_project ON sessions(project_key, ts DESC);
  `)
  return _db
}

export function upsertSession(record: SessionRecord): void {
  const db = getDb()
  db.prepare(`
    INSERT OR REPLACE INTO sessions (project_key, summary, file_paths, key_decisions, ts)
    VALUES (@project_key, @summary, @file_paths, @key_decisions, @ts)
  `).run(record)
}

export function getLatestSession(projectKey: string): SessionRecord | null {
  const db = getDb()
  const row = db.prepare(`
    SELECT * FROM sessions
    WHERE project_key = ?
    ORDER BY ts DESC
    LIMIT 1
  `).get(projectKey) as SessionRecord | undefined
  return row ?? null
}

export function listRecentSessions(limit = 20): SessionRecord[] {
  const db = getDb()
  return db.prepare(`
    SELECT * FROM sessions
    ORDER BY ts DESC
    LIMIT ?
  `).all(limit) as SessionRecord[]
}
