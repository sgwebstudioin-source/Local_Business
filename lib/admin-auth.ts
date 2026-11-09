import "server-only";
import { createHash, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "cl_admin";

function expectedToken(): string | null {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return null;
  return createHash("sha256").update(`cl-admin-v1:${password}`).digest("hex");
}

export function passwordToken(password: string): string {
  return createHash("sha256").update(`cl-admin-v1:${password}`).digest("hex");
}

export async function isAdmin(): Promise<boolean> {
  const expected = expectedToken();
  if (!expected) return false;
  const cookie = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!cookie || cookie.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(cookie), Buffer.from(expected));
}
