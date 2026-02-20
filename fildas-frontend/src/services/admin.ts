import api from "./api";

export interface AdminUser {
  id: number;
  full_name: string;
  first_name: string;
  middle_name?: string | null;
  last_name: string;
  suffix?: string | null;
  email: string;
  profile_photo_path?: string | null;
  role_id: number | null;
  office_id: number | null;
  created_at: string;
  updated_at: string;
  role?: {
    id: number;
    name: string;
  } | null;
  office?: {
    id: number;
    name: string;
    code: string;
  } | null;
}

export interface AdminUsersResponse {
  data: AdminUser[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from?: number;
    to?: number;
  };
}

export async function getAdminUsers(params: {
  page?: number;
  q?: string;
}): Promise<AdminUsersResponse> {
  const res = await api.get("/admin/users", { params });
  return res.data as AdminUsersResponse;
}

export type AdminRole = {
  id: number;
  name: string;
  label: string;
};

export type AdminOffice = {
  id: number;
  code: string;
  name: string;
};

export async function getAdminRoles(): Promise<AdminRole[]> {
  const res = await api.get("/admin/roles");
  return res.data as AdminRole[];
}

export async function getAdminOffices(): Promise<AdminOffice[]> {
  const res = await api.get("/admin/offices");
  return res.data as AdminOffice[];
}

export type AdminUserUpdatePayload = Partial<{
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  suffix: string | null;
  email: string | null;
  office_id: number | null;
  role_id: number | null;
  password: string | null;
}>;

export async function updateAdminUser(
  userId: number,
  payload: AdminUserUpdatePayload,
): Promise<{ user: AdminUser }> {
  const res = await api.patch(`/admin/users/${userId}`, payload);
  return res.data as { user: AdminUser };
}

export type AdminUserCreatePayload = {
  first_name: string;
  middle_name?: string | null;
  last_name: string;
  suffix?: string | null;
  email: string;
  password: string;
  office_id?: number | null;
  role_id?: number | null;
};

export async function createAdminUser(
  payload: AdminUserCreatePayload,
): Promise<{ user: AdminUser }> {
  const res = await api.post("/admin/users", payload);
  return res.data as { user: AdminUser };
}
