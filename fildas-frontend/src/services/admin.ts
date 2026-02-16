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
