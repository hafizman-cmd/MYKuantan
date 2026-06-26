import { createHmac, timingSafeEqual } from "crypto";

export const ADMIN_COOKIE_NAME = "kuantan_admin_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;

function signPayload(secret: string): string {
  const exp = Date.now() + SESSION_MAX_AGE_SECONDS * 1000;
  const payload = `exp=${exp}`;
  const mac = createHmac("sha256", secret).update(payload).digest("hex");
  return `${exp}.${mac}`;
}

export function issueAdminSessionToken(secret: string): string {
  return signPayload(secret);
}

export function verifyAdminSessionToken(
  token: string,
  secret: string
): boolean {
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [expStr, mac] = parts;
  const expNum = Number(expStr);
  if (!Number.isFinite(expNum) || expNum < Date.now()) return false;
  const expected = createHmac("sha256", secret)
    .update(`exp=${expStr}`)
    .digest("hex");
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function getAdminEnv(): { password: string; secret: string } {
  const password = process.env.ADMIN_ACCESS_PASSWORD;
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!password || !secret) {
    throw new Error("Admin auth env vars not configured.");
  }
  return {
    password: cleanEnvValue(password),
    secret: cleanEnvValue(secret),
  };
}

export function cleanEnvValue(value: string): string {
  return value.replace(/^["'`]|["'`]$/g, "");
}

export function safeComparePassword(input: string, expected: string): boolean {
  const a = Buffer.from(String(input));
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}