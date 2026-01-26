import { getAuthUser } from "./auth";

export type UserRole = "QA" | "DEPARTMENT" | "VPAA" | "PRESIDENT";

export const getUserRole = (): UserRole => {
  const user = getAuthUser();
  const raw = String(user?.role ?? "QA").toUpperCase();

  if (raw === "QA") return "QA";
  if (raw === "DEPARTMENT") return "DEPARTMENT";
  if (raw === "VPAA") return "VPAA";
  if (raw === "PRESIDENT") return "PRESIDENT";

  // fallback instead of crashing the app
  return "QA";
};


export const isPendingForRole = (status: string, role: UserRole): boolean => {
  const filters: Record<UserRole, string[]> = {
    QA: ["Draft", "For QA Distribution"],
    DEPARTMENT: ["For Department Review", "For Department Approval"],
    VPAA: ["For VPAA Review", "For VPAA Approval"],
    PRESIDENT: ["For President Approval"],
  };

  return (filters[role] ?? []).includes(status ?? "");
};


export const isQA = (role: UserRole): boolean => role === "QA";
