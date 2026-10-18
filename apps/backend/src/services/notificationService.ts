import { query, Queryable } from "../db/pool";
import { HttpError } from "../utils/httpError";

// Call with the transaction's client so the notification commits or rolls back with the action.
export async function notify(
  db: Queryable,
  userId: number,
  type: string,
  title: string,
  body?: string,
  link?: string
) {
  await db.query(
    "INSERT INTO notifications (user_id, type, title, body, link) VALUES ($1, $2, $3, $4, $5)",
    [userId, type, title, body ?? null, link ?? null]
  );
}

export async function listNotifications(userId: number, unreadOnly: boolean, page: number, pageSize: number) {
  const extra = unreadOnly ? "AND is_read = FALSE" : "";
  const rows = await query(
    `SELECT id, type, title, body, link, is_read, created_at FROM notifications
      WHERE user_id = $1 ${extra} ORDER BY created_at DESC, id DESC LIMIT $2 OFFSET $3`,
    [userId, pageSize, (page - 1) * pageSize]
  );
  const total = await query(`SELECT COUNT(*) AS n FROM notifications WHERE user_id = $1 ${extra}`, [userId]);
  return { items: rows.rows, page, pageSize, total: total.rows[0].n as number };
}

export async function unreadCount(userId: number) {
  const r = await query("SELECT COUNT(*) AS n FROM notifications WHERE user_id = $1 AND is_read = FALSE", [userId]);
  return r.rows[0].n as number;
}

export async function markRead(userId: number, id: number) {
  const r = await query("UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2 RETURNING id", [id, userId]);
  if (!r.rowCount) throw new HttpError(404, "Notification not found");
}

export async function markAllRead(userId: number) {
  await query("UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE", [userId]);
}