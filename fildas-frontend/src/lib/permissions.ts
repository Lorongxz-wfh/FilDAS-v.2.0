import type { AuthUser } from "./auth";

export type Role =
  | "admin"
  | "qa"
  | "department"
  | "vpaa"
  | "vpadmin"
  | "vpfinance"
  | "vpreqa"
  | "president"
  | "auditor";

export function hasReportsAccess(user: AuthUser | null): boolean {
  const role = user?.role as Role | undefined;
  return (
    role === "admin" ||
    role === "qa" ||
    role === "vpaa" ||
    role === "vpadmin" ||
    role === "vpfinance" ||
    role === "vpreqa" ||
    role === "president"
  );
}

export function isAdmin(user: AuthUser | null): boolean {
  return (user?.role as Role | undefined) === "admin";
}

export function isAuditor(user: AuthUser | null): boolean {
  return (user?.role as Role | undefined) === "auditor";
}
