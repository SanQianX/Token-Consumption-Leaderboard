import { readFile } from "node:fs/promises"
import { join } from "node:path"
import pool from "./client.js"

async function runMigrations() {
  const client = await pool.connect()
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        applied_at TIMESTAMPTZ DEFAULT NOW()
      )
    `)

    const { rows } = await client.query("SELECT name FROM migrations ORDER BY id")
    const applied = new Set(rows.map((r: { name: string }) => r.name))

    const migrationFiles = ["001_initial.sql"]

    for (const file of migrationFiles) {
      if (applied.has(file)) {
        console.log(`Skipping already applied: ${file}`)
        continue
      }

      console.log(`Running migration: ${file}`)
      const sql = await readFile(
        join(import.meta.dirname, "migrations", file),
        "utf-8"
      )

      await client.query("BEGIN")
      await client.query(sql)
      await client.query("INSERT INTO migrations (name) VALUES ($1)", [file])
      await client.query("COMMIT")

      console.log(`Applied: ${file}`)
    }

    console.log("All migrations applied successfully")
  } catch (err) {
    await client.query("ROLLBACK")
    console.error("Migration failed:", err)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

runMigrations()
