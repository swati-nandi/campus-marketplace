import bcrypt from "bcryptjs";
import { env } from "../config/env";
import { query, withTransaction } from "../db/pool";
import { HttpError } from "../utils/httpError";
import { RegisterInput } from "../validators/schemas";

// Compared against when the email doesn't exist, so response time doesn't reveal which emails are registered.
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 10);

export async function register(input: RegisterInput) {
  const domain = input.email.split("@")[1]?.toLowerCase();
  if (!domain || !env.allowedEmailDomains.includes(domain)) {
    throw new HttpError(400, `Use your student email (${env.allowedEmailDomains.map((d) => "@" + d).join(", ")})`);
  }

  const hash = await bcrypt.hash(input.password, 12);
  // Only "dev" verification is implemented: accounts are auto-verified. Any other mode leaves
  // email_verified_at empty, and login is refused until a real verification flow exists.
  const verifiedAt = env.emailVerificationMode === "dev" ? new Date() : null;

  try {
    return await withTransaction(async (c) => {
      const u = await c.query(
        "INSERT INTO users (email, password_hash, email_verified_at) VALUES ($1, $2, $3) RETURNING id, email, role",
        [input.email, hash, verifiedAt]
      );
      const user = u.rows[0];
      await c.query(
        "INSERT INTO user_profiles (user_id, full_name, reg_no, phone, hostel_block) VALUES ($1, $2, $3, $4, $5)",
        [user.id, input.fullName, input.regNo ?? null, input.phone ?? null, input.hostelBlock ?? null]
      );
      return { id: user.id as number, email: user.email as string, role: user.role as "student" | "admin", fullName: input.fullName };
    });
  } catch (err: any) {
    if (err.code === "23505") {
      if (String(err.constraint).includes("reg_no")) throw new HttpError(409, "Registration number already registered");
      throw new HttpError(409, "Email already registered");
    }
    throw err;
  }
}

export async function login(email: string, password: string) {
  const { rows } = await query(
    `SELECT u.id, u.email, u.role, u.password_hash, u.is_suspended, u.email_verified_at, p.full_name
       FROM users u JOIN user_profiles p ON p.user_id = u.id
      WHERE u.email = $1`,
    [email]
  );
  const u = rows[0];
  const ok = await bcrypt.compare(password, u?.password_hash ?? DUMMY_HASH);
  if (!u || !ok) throw new HttpError(401, "Invalid email or password");
  if (u.is_suspended) throw new HttpError(403, "Account suspended");
  if (!u.email_verified_at) throw new HttpError(403, "Email not verified");
  return { id: u.id as number, email: u.email as string, role: u.role as "student" | "admin", fullName: u.full_name as string };
}

export async function getMe(userId: number) {
  const { rows } = await query(
    `SELECT u.id, u.email, u.role, p.full_name AS "fullName", p.reg_no AS "regNo",
            p.phone, p.hostel_block AS "hostelBlock", p.bio
       FROM users u JOIN user_profiles p ON p.user_id = u.id WHERE u.id = $1`,
    [userId]
  );
  if (!rows[0]) throw new HttpError(404, "User not found");
  return rows[0];
}