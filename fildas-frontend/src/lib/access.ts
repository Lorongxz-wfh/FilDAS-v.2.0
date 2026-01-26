import { getAuthUser } from "./auth";

export type AppRole = "QA" | "DEPARTMENT" | "VPAA" | "PRESIDENT";

export function getRole(): string | null {
  return getAuthUser()?.role ?? null;
}

export function hasRole(...roles: AppRole[]): boolean {
  const r = getRole();
  if (!r) return false;
  return roles.includes(r as AppRole);
}

export function requireRole(roles: AppRole[]): { ok: boolean; reason?: string } {
  const r = getRole();
  if (!r) return { ok: false, reason: "Not logged in" };
  if (!roles.includes(r as AppRole)) return { ok: false, reason: "Not allowed" };
  return { ok: true };
}
