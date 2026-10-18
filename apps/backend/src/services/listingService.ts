import { query, withTransaction } from "../db/pool";
import { HttpError } from "../utils/httpError";
import { ListingInput, ListingQuery } from "../validators/schemas";

const LIST_COLUMNS = `v.id, v.title, v.condition, v.listing_type, v.price, v.deposit, v.rental_unit,
  v.created_at, v.category_id, v.category_name, v.location_id, v.location_name,
  v.owner_id, v.owner_name, v.cover_image`;

export async function searchListings(f: ListingQuery) {
  const where: string[] = [];
  const params: unknown[] = [];
  const add = (sql: string, value: unknown) => {
    params.push(value);
    where.push(sql.replace("?", `$${params.length}`));
  };

  let qIdx = 0;
  if (f.q) {
    params.push(f.q);
    qIdx = params.length;
    // Full-text match, plus substring match so partial words like "calc" still work.
    where.push(
      `(v.search_tsv @@ websearch_to_tsquery('english', $${qIdx}::text) OR v.title ILIKE '%' || $${qIdx}::text || '%')`
    );
  }
  if (f.category) add("v.category_id = (SELECT id FROM categories WHERE slug = ?)", f.category);
  if (f.type) add("v.listing_type = ?", f.type);
  if (f.condition) add("v.condition = ?", f.condition);
  if (f.locationId) add("v.location_id = ?", f.locationId);
  if (f.minPrice !== undefined) add("v.price >= ?", f.minPrice);
  if (f.maxPrice !== undefined) add("v.price <= ?", f.maxPrice);
  if (f.postedAfter) add("v.created_at >= ?", f.postedAfter);

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const sort = f.sort ?? (f.q ? "relevance" : "newest");
  const orderBy = {
    newest: "v.created_at DESC, v.id DESC",
    price_asc: "v.price ASC NULLS LAST, v.id DESC",
    price_desc: "v.price DESC NULLS LAST, v.id DESC",
    relevance: qIdx
      ? `ts_rank(v.search_tsv, websearch_to_tsquery('english', $${qIdx}::text)) DESC, v.id DESC`
      : "v.created_at DESC, v.id DESC",
  }[sort];

  const totalRes = await query(`SELECT COUNT(*) AS n FROM v_available_listings v ${whereSql}`, params);
  const limitIdx = params.length + 1;
  const rows = await query(
    `SELECT ${LIST_COLUMNS} FROM v_available_listings v ${whereSql}
      ORDER BY ${orderBy} LIMIT $${limitIdx} OFFSET $${limitIdx + 1}`,
    [...params, f.pageSize, (f.page - 1) * f.pageSize]
  );

  return { items: rows.rows, page: f.page, pageSize: f.pageSize, total: totalRes.rows[0].n as number };
}

export async function getListing(id: number) {
  const { rows } = await query(
    `SELECT l.id, l.title, l.description, l.condition, l.listing_type, l.price, l.deposit, l.rental_unit,
            l.status, l.created_at, l.updated_at,
            l.category_id, c.name AS category_name,
            l.location_id, loc.name AS location_name,
            l.owner_id, p.full_name AS owner_name,
            r.avg_rating AS owner_avg_rating, COALESCE(r.review_count, 0) AS owner_review_count
       FROM listings l
       JOIN categories c ON c.id = l.category_id
       JOIN user_profiles p ON p.user_id = l.owner_id
       LEFT JOIN campus_locations loc ON loc.id = l.location_id
       LEFT JOIN v_user_ratings r ON r.user_id = l.owner_id
      WHERE l.id = $1 AND l.status <> 'removed'`,
    [id]
  );
  if (!rows[0]) throw new HttpError(404, "Listing not found");
  const images = await query("SELECT url FROM listing_images WHERE listing_id = $1 ORDER BY position", [id]);
  return { ...rows[0], images: images.rows.map((i: { url: string }) => i.url) };
}

export async function myListings(userId: number) {
  const { rows } = await query(
    `SELECT l.id, l.title, l.condition, l.listing_type, l.price, l.status, l.created_at,
            (SELECT url FROM listing_images i WHERE i.listing_id = l.id ORDER BY position LIMIT 1) AS cover_image
       FROM listings l WHERE l.owner_id = $1 AND l.status <> 'removed' ORDER BY l.created_at DESC`,
    [userId]
  );
  return rows;
}

export async function createListing(ownerId: number, input: ListingInput) {
  const id = await withTransaction(async (c) => {
    const { rows } = await c.query(
      `INSERT INTO listings (owner_id, category_id, location_id, title, description, condition,
                             listing_type, price, deposit, rental_unit)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
      [ownerId, input.categoryId, input.locationId ?? null, input.title, input.description, input.condition,
       input.listingType, input.price ?? null, input.deposit ?? null, input.rentalUnit ?? null]
    );
    const listingId = rows[0].id as number;
    for (const [pos, url] of (input.imageUrls ?? []).entries()) {
      await c.query("INSERT INTO listing_images (listing_id, url, position) VALUES ($1, $2, $3)", [listingId, url, pos]);
    }
    return listingId;
  }, ownerId);
  return getListing(id);
}

export async function updateListing(id: number, userId: number, role: string, input: ListingInput) {
  await withTransaction(async (c) => {
    const { rows } = await c.query("SELECT owner_id, status FROM listings WHERE id = $1 FOR UPDATE", [id]);
    const l = rows[0];
    if (!l || l.status === "removed") throw new HttpError(404, "Listing not found");
    if (l.owner_id !== userId && role !== "admin") throw new HttpError(403, "You can only edit your own listings");
    if (l.status !== "available") throw new HttpError(409, `Cannot edit a ${l.status} listing`);

    await c.query(
      `UPDATE listings SET category_id=$1, location_id=$2, title=$3, description=$4, condition=$5,
              listing_type=$6, price=$7, deposit=$8, rental_unit=$9 WHERE id=$10`,
      [input.categoryId, input.locationId ?? null, input.title, input.description, input.condition,
       input.listingType, input.price ?? null, input.deposit ?? null, input.rentalUnit ?? null, id]
    );
    if (input.imageUrls) {
      await c.query("DELETE FROM listing_images WHERE listing_id = $1", [id]);
      for (const [pos, url] of input.imageUrls.entries()) {
        await c.query("INSERT INTO listing_images (listing_id, url, position) VALUES ($1, $2, $3)", [id, url, pos]);
      }
    }
  }, userId);
  return getListing(id);
}

// Soft delete: transactions keep referencing the row, so history is preserved.
export async function deleteListing(id: number, userId: number, role: string) {
  await withTransaction(async (c) => {
    const { rows } = await c.query("SELECT owner_id, status FROM listings WHERE id = $1 FOR UPDATE", [id]);
    const l = rows[0];
    if (!l || l.status === "removed") throw new HttpError(404, "Listing not found");
    if (l.owner_id !== userId && role !== "admin") throw new HttpError(403, "You can only delete your own listings");
    if (l.status !== "available") throw new HttpError(409, `Cannot delete a ${l.status} listing`);
    await c.query("UPDATE listings SET status = 'removed' WHERE id = $1", [id]);
    await c.query("UPDATE purchase_requests SET status = 'rejected' WHERE listing_id = $1 AND status = 'pending'", [id]);
  }, userId);
}

export async function listCategories() {
  const { rows } = await query("SELECT id, name, slug FROM categories ORDER BY name");
  return rows;
}

export async function listLocations() {
  const { rows } = await query("SELECT id, name, kind FROM campus_locations ORDER BY name");
  return rows;
}