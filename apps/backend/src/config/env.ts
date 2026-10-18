import path from "path";
import dotenv from "dotenv";

// Loads the repo-root .env regardless of the directory the command runs from.
dotenv.config({ path: path.resolve(__dirname, "../../../../.env") });

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing environment variable ${name} (see .env.example)`);
  return v;
}

const isTest = process.env.NODE_ENV === "test";
const databaseUrl = isTest ? required("TEST_DATABASE_URL") : required("DATABASE_URL");

if (isTest && databaseUrl === process.env.DATABASE_URL) {
  throw new Error("TEST_DATABASE_URL must differ from DATABASE_URL. Tests wipe tables.");
}

const jwtSecret = required("JWT_SECRET");
if (!isTest && (jwtSecret.length < 16 || jwtSecret.startsWith("replace-with"))) {
  throw new Error("JWT_SECRET is a placeholder. Generate a real one.");
}

export const env = {
  isTest,
  port: Number(process.env.PORT ?? 4000),
  databaseUrl,
  jwtSecret,
  cookieSecure: process.env.COOKIE_SECURE === "true",
  corsOrigins: (process.env.CORS_ORIGIN ?? "http://localhost:5173").split(",").map((s) => s.trim()),
  emailVerificationMode: process.env.EMAIL_VERIFICATION_MODE ?? "dev",
  allowedEmailDomains: (process.env.ALLOWED_EMAIL_DOMAINS ?? "vitstudent.ac.in")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean),
};