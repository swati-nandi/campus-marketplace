import { Pool, PoolClient, types } from "pg";
import { env } from "../config/env";

// pg returns BIGINT and NUMERIC as strings by default. Our values are small, so parse them.
types.setTypeParser(20, (v) => parseInt(v, 10));
types.setTypeParser(1700, (v) => parseFloat(v));
types.setTypeParser(1082, (v) => v);

export const pool = new Pool({ connectionString: env.databaseUrl, max: 10 });

export type Queryable = { query: (text: string, params?: any[]) => Promise<any> };

export function query(text: string, params?: unknown[]) {
  return pool.query(text, params as any[]);
}

/**
 * Runs fn inside BEGIN/COMMIT (ROLLBACK on any error).
 * If userId is given it is exposed to triggers as app.user_id (used by the status-history trigger).
 */
export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>,
  userId?: number
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    if (userId !== undefined) {
      await client.query("SELECT set_config('app.user_id', $1, true)", [String(userId)]);
    }
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}