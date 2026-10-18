import { CookieOptions, Router } from "express";
import { env } from "../config/env";
import { COOKIE_NAME, requireAuth, signToken } from "../middleware/auth";
import { loginLimiter } from "../middleware/rateLimit";
import * as authService from "../services/authService";
import { asyncHandler } from "../utils/httpError";
import { loginSchema, registerSchema } from "../validators/schemas";

const router = Router();

const cookieOptions: CookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: env.cookieSecure,
  path: "/",
};

router.post("/register", asyncHandler(async (req, res) => {
  const user = await authService.register(registerSchema.parse(req.body));
  res.cookie(COOKIE_NAME, signToken(user), { ...cookieOptions, maxAge: 7 * 24 * 3600 * 1000 });
  res.status(201).json({ user });
}));

router.post("/login", loginLimiter, asyncHandler(async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);
  const user = await authService.login(email, password);
  res.cookie(COOKIE_NAME, signToken(user), { ...cookieOptions, maxAge: 7 * 24 * 3600 * 1000 });
  res.json({ user });
}));

router.post("/logout", (_req, res) => {
  res.clearCookie(COOKIE_NAME, cookieOptions);
  res.json({ ok: true });
});

router.get("/me", requireAuth, asyncHandler(async (req, res) => {
  res.json({ user: await authService.getMe(req.user!.id) });
}));

export default router;