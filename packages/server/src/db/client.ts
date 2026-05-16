import pg from "pg"

const { Pool } = pg

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

export async function query(text: string, params?: unknown[]) {
  const start = Date.now()
  const result = await pool.query(text, params)
  const duration = Date.now() - start
  console.log("executed query", { text: text.slice(0, 80), duration: `${duration}ms`, rows: result.rowCount })
  return result
}

export async function getClient() {
  const client = await pool.connect()
  return client
}

export default pool
