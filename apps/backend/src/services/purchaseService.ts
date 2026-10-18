import { query, withTransaction } from "../db/pool";
import { HttpError } from "../utils/httpError";
import { notify } from "./notificationService";

export async function createRequest(buyerId: number, listingId: number, message?: string) {
  try {
    return await withTransaction(async (c) => {
      // FOR SHARE waits while a concurrent accept holds the row, then sees its final status.
      const { rows } = await c.query(
        "SELECT id, owner_id, status, listing_type, title FROM listings WHERE id = $1 FOR SHARE",
        [listingId]
      );
      const l = rows[0];
      if (!l || l.status === "removed") throw new HttpError(404, "Listing not found");
      if (l.owner_id === buyerId) throw new HttpError(400, "You cannot request your own listing");
      if (l.listing_type !== "sale") throw new HttpError(400, "Only sale listings accept purchase requests");
      if (l.status !== "available") throw new HttpError(409, "Listing is no longer available");

      const ins = await c.query(
        "INSERT INTO purchase_requests (listing_id, buyer_id, message) VALUES ($1, $2, $3) RETURNING *",
        [listingId, buyerId, message ?? null]
      );
      await notify(c, l.owner_id, "purchase_request", "New purchase request", `Someone wants "${l.title}"`, "/requests/incoming");
      return ins.rows[0];
    }, buyerId);
  } catch (err: any) {
    if (err.code === "23505") throw new HttpError(409, "You already have a pending request for this listing");
    throw err;
  }
}

export async function listIncoming(sellerId: number) {
  const { rows } = await query(
    `SELECT pr.id, pr.status, pr.message, pr.created_at, pr.listing_id, l.title AS listing_title, l.price,
            pr.buyer_id, bp.full_name AS buyer_name
       FROM purchase_requests pr
       JOIN listings l ON l.id = pr.listing_id
       JOIN user_profiles bp ON bp.user_id = pr.buyer_id
      WHERE l.owner_id = $1 ORDER BY pr.created_at DESC LIMIT 100`,
    [sellerId]
  );
  return rows;
}

export async function listOutgoing(buyerId: number) {
  const { rows } = await query(
    `SELECT pr.id, pr.status, pr.message, pr.created_at, pr.listing_id, l.title AS listing_title, l.price,
            l.owner_id AS seller_id, sp.full_name AS seller_name
       FROM purchase_requests pr
       JOIN listings l ON l.id = pr.listing_id
       JOIN user_profiles sp ON sp.user_id = l.owner_id
      WHERE pr.buyer_id = $1 ORDER BY pr.created_at DESC LIMIT 100`,
    [buyerId]
  );
  return rows;
}

/**
 * Accept a request: reserve the listing and create the transaction, atomically.
 * Lock order is always listing -> request, so two concurrent accepts on the same listing
 * serialize on the listing row (no deadlock); the loser sees status <> 'available' and gets 409.
 */
export async function acceptRequest(sellerId: number, requestId: number) {
  return withTransaction(async (c) => {
    const pre = await c.query("SELECT listing_id FROM purchase_requests WHERE id = $1", [requestId]);
    if (!pre.rows[0]) throw new HttpError(404, "Request not found");
    const listingId = pre.rows[0].listing_id as number | null;
    if (listingId == null) throw new HttpError(400, "Bundle requests are not supported yet");

    const lres = await c.query("SELECT id, owner_id, status, price, title FROM listings WHERE id = $1 FOR UPDATE", [listingId]);
    const l = lres.rows[0];
    if (l.owner_id !== sellerId) throw new HttpError(403, "Only the seller can accept this request");

    const pres = await c.query("SELECT id, buyer_id, status FROM purchase_requests WHERE id = $1 FOR UPDATE", [requestId]);
    const pr = pres.rows[0];
    if (pr.status !== "pending") throw new HttpError(409, "Request is no longer pending");
    if (l.status !== "available") throw new HttpError(409, "Listing is no longer available");

    // Conditional update as a second guard.
    const upd = await c.query("UPDATE listings SET status = 'reserved' WHERE id = $1 AND status = 'available' RETURNING id", [listingId]);
    if (!upd.rowCount) throw new HttpError(409, "Listing is no longer available");

    await c.query("UPDATE purchase_requests SET status = 'accepted' WHERE id = $1", [requestId]);
    const others = await c.query(
      "UPDATE purchase_requests SET status = 'rejected' WHERE listing_id = $1 AND id <> $2 AND status = 'pending' RETURNING buyer_id",
      [listingId, requestId]
    );
    await c.query("UPDATE offers SET status = 'rejected' WHERE listing_id = $1 AND status = 'pending'", [listingId]);

    const tx = await c.query(
      `INSERT INTO transactions (purchase_request_id, listing_id, buyer_id, seller_id, amount)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [requestId, listingId, pr.buyer_id, sellerId, l.price]
    );

    await notify(c, pr.buyer_id, "request_accepted", "Request accepted", `Your request for "${l.title}" was accepted. Arrange a meetup.`, "/transactions");
    for (const o of others.rows) {
      await notify(c, o.buyer_id, "request_rejected", "Request declined", `"${l.title}" is no longer available.`, "/requests/outgoing");
    }
    return tx.rows[0];
  }, sellerId);
}

async function decide(actorId: number, requestId: number, who: "seller" | "buyer", next: "rejected" | "cancelled") {
  return withTransaction(async (c) => {
    const { rows } = await c.query(
      `SELECT pr.id, pr.status, pr.buyer_id, l.owner_id, l.title
         FROM purchase_requests pr JOIN listings l ON l.id = pr.listing_id
        WHERE pr.id = $1 FOR UPDATE OF pr`,
      [requestId]
    );
    const r = rows[0];
    if (!r) throw new HttpError(404, "Request not found");
    const allowed = who === "seller" ? r.owner_id === actorId : r.buyer_id === actorId;
    if (!allowed) throw new HttpError(403, `Only the ${who} can do this`);
    if (r.status !== "pending") throw new HttpError(409, "Request is no longer pending");

    await c.query("UPDATE purchase_requests SET status = $1 WHERE id = $2", [next, requestId]);
    if (next === "rejected") {
      await notify(c, r.buyer_id, "request_rejected", "Request declined", `Your request for "${r.title}" was declined.`, "/requests/outgoing");
    } else {
      await notify(c, r.owner_id, "request_cancelled", "Request cancelled", `A buyer cancelled their request for "${r.title}".`, "/requests/incoming");
    }
    return { id: requestId, status: next };
  }, actorId);
}

export const rejectRequest = (sellerId: number, requestId: number) => decide(sellerId, requestId, "seller", "rejected");
export const cancelRequest = (buyerId: number, requestId: number) => decide(buyerId, requestId, "buyer", "cancelled");

export async function listTransactions(userId: number) {
  const { rows } = await query(
    `SELECT t.id, t.status, t.amount, t.payment_method, t.payment_confirmed_at, t.created_at, t.completed_at,
            t.listing_id, l.title AS listing_title,
            t.buyer_id, bp.full_name AS buyer_name, t.seller_id, sp.full_name AS seller_name,
            CASE WHEN t.buyer_id = $1 THEN 'buyer' ELSE 'seller' END AS my_role
       FROM transactions t
       LEFT JOIN listings l ON l.id = t.listing_id
       JOIN user_profiles bp ON bp.user_id = t.buyer_id
       JOIN user_profiles sp ON sp.user_id = t.seller_id
      WHERE t.buyer_id = $1 OR t.seller_id = $1
      ORDER BY t.created_at DESC LIMIT 100`,
    [userId]
  );
  return rows;
}

// Seller confirms the in-person handover. This records the seller's confirmation; it is NOT verified payment.
export async function completeTransaction(sellerId: number, txId: number) {
  return withTransaction(async (c) => {
    const { rows } = await c.query("SELECT * FROM transactions WHERE id = $1 FOR UPDATE", [txId]);
    const t = rows[0];
    if (!t) throw new HttpError(404, "Transaction not found");
    if (t.seller_id !== sellerId) throw new HttpError(403, "Only the seller can complete a transaction");
    if (t.status !== "pending_meetup") throw new HttpError(409, `Transaction is already ${t.status}`);

    await c.query("SELECT id FROM listings WHERE id = $1 FOR UPDATE", [t.listing_id]);
    const upd = await c.query(
      `UPDATE transactions SET status = 'completed', payment_confirmed_at = now(), completed_at = now()
        WHERE id = $1 RETURNING *`,
      [txId]
    );
    await c.query("UPDATE listings SET status = 'sold' WHERE id = $1", [t.listing_id]);
    await notify(c, t.buyer_id, "transaction_completed", "Transaction completed", "The seller confirmed the handover. You can now leave a review.", "/transactions");
    return upd.rows[0];
  }, sellerId);
}

export async function cancelTransaction(userId: number, txId: number) {
  return withTransaction(async (c) => {
    const { rows } = await c.query("SELECT * FROM transactions WHERE id = $1 FOR UPDATE", [txId]);
    const t = rows[0];
    if (!t) throw new HttpError(404, "Transaction not found");
    if (t.buyer_id !== userId && t.seller_id !== userId) throw new HttpError(403, "Not your transaction");
    if (t.status !== "pending_meetup") throw new HttpError(409, `Transaction is already ${t.status}`);

    await c.query("SELECT id FROM listings WHERE id = $1 FOR UPDATE", [t.listing_id]);
    const upd = await c.query("UPDATE transactions SET status = 'cancelled' WHERE id = $1 RETURNING *", [txId]);
    await c.query("UPDATE listings SET status = 'available' WHERE id = $1 AND status = 'reserved'", [t.listing_id]);
    const other = t.buyer_id === userId ? t.seller_id : t.buyer_id;
    await notify(c, other, "transaction_cancelled", "Transaction cancelled", "The other party cancelled. The listing is available again.", "/transactions");
    return upd.rows[0];
  }, userId);
}