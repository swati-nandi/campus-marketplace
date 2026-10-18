import bcrypt from "bcryptjs";
import { pool, withTransaction } from "../src/db/pool";

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD in .env first");
  if (password.length < 12) throw new Error("ADMIN_PASSWORD must be at least 12 characters");

  const hash = await bcrypt.hash(password, 12);
  const created = await withTransaction(async (c) => {
    const u = await c.query(
      `INSERT INTO users (email, password_hash, role, email_verified_at)
       VALUES ($1, $2, 'admin', now()) ON CONFLICT (email) DO NOTHING RETURNING id`,
      [email, hash]
    );
    if (!u.rows[0]) return false;
    await c.query("INSERT INTO user_profiles (user_id, full_name) VALUES ($1, 'Administrator')", [u.rows[0].id]);
    return true;
  });
  console.log(created ? `Admin created: ${email}` : `A user with ${email} already exists. Nothing changed.`);
}

main().catch((e) => { console.error(e.message); process.exitCode = 1; }).finally(() => pool.end());