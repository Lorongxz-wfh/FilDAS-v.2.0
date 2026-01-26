import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { getUserRole } from "../roleFilters";

type Props = {
  allow: string[];
  redirectTo?: string;
};

export default function RequireRole({
  allow,
  redirectTo = "/work-queue",
}: Props) {
  const role = String(getUserRole() ?? "")
    .trim()
    .toUpperCase();
  const ok = allow.map((r) => r.toUpperCase()).includes(role);

  if (!ok) return <Navigate to={redirectTo} replace />;
  return <Outlet />;
}
