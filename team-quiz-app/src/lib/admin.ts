import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE = "quiz_admin";
function signature(value: string) {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error("ADMIN_SESSION_SECRET must be at least 32 characters.");
  return createHmac("sha256", secret).update(value).digest("hex");
}
export function validPassword(value: string) {
  const expected = process.env.ADMIN_PASSWORD || "";
  if (!expected || !value || expected.length < 16) return false;
  const a = Buffer.from(value), b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
export async function setAdminCookie() {
  const jar = await cookies();
  const value = `${Date.now() + 8 * 60 * 60 * 1000}`;
  jar.set(COOKIE, `${value}.${signature(value)}`, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: 8 * 60 * 60 });
}
export async function isAdmin() {
  const raw = (await cookies()).get(COOKIE)?.value || "";
  const [value, sig] = raw.split(".");
  if (!value || !sig || Number(value) < Date.now()) return false;
  const expected = signature(value);
  const a = Buffer.from(sig), b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
export async function clearAdminCookie() {
  (await cookies()).set(COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: 0 });
}