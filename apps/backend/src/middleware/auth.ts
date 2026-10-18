import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { query } from "../db/pool";
import { asyncHandler, HttpError } from "../utils/httpError";

export const COOKIE_NAME = "vitx_token";

export interface AuthUser {
  id: number;
  role: "student" | "admin";
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function signToken(user: AuthUser): string {
  return jwt.sign({ role: user.role }, env.jwtSecret, { subject: String(user.id), expiresIn: "7d" });
}

// The user is re-read from the database on every request, so suspensions and role changes apply immediately.
export const requireAuth = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) throw new HttpError(401, "Authentication required");

  let payload: jwt.JwtPayload;
  try {
    payload = jwt.verify(token, env.jwtSecret) as jwt.JwtPayload;
  } catch {
    throw new HttpError(401, "Invalid or expired session");
  }

  const { rows } = await query("SELECT id, role, is_suspended FROM users WHERE id = $1", [Number(payload.sub)]);
  const u = rows[0];
  if (!u) throw new HttpError(401, "Account no longer exists");
  if (u.is_suspended) throw new HttpError(403, "Account suspended");

  req.user = { id: u.id, role: u.role };
  next();
});

export const requireRole =
  (role: AuthUser["role"]) => (req: Request, _res: Response, next: NextFunction) => {
    if (req.user?.role !== role) return next(new HttpError(403, "Forbidden"));
    next();
  };