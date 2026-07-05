// Shared-password gate for /manager. The cookie stores a hash of the password
// (not the password itself), so it can't be forged without knowing it.
import "server-only";
import { createHash } from "node:crypto";

export const MGR_COOKIE = "wos_mgr";

function token(): string | null {
  const pw = process.env.MANAGER_PASSWORD;
  return pw ? createHash("sha256").update(pw).digest("hex") : null;
}

/** False when no password is configured — the page then fails closed. */
export function managerConfigured(): boolean {
  return !!process.env.MANAGER_PASSWORD;
}

export function sessionToken(): string | null {
  return token();
}

export function checkPassword(input: string): boolean {
  const pw = process.env.MANAGER_PASSWORD;
  return !!pw && input === pw;
}

export function isAuthed(cookieValue: string | undefined): boolean {
  const t = token();
  return !!t && cookieValue === t;
}
