import { getAuthUser, clearAuthAndRedirect } from "../lib/auth";
import api from "./api";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api";

export interface CreateDocumentPayload {
  title: string;
  owner_office_id: number;
  doctype: "internal" | "external" | "forms";
  description?: string;
  visibility_scope?: "office" | "global";
  school_year?: string;
  semester?: string;
  file?: File | null;
}

export interface Document {
  id: number;
  title: string;
  office_id: number | null;
  office: {
    // ← ADD
    id: number;
    name: string;
    code: string;
  } | null;
  parent_document_id?: number | null;
  doctype: "internal" | "external" | "forms";
  code: string | null;
  status: string;
  version_number: number;
  file_path: string | null;
  preview_path: string | null;
  original_filename: string | null;
  current_step_notes?: string | null;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

export async function createDocumentWithProgress(
  payload: CreateDocumentPayload,
  onProgress?: (pct: number) => void,
): Promise<Document> {
  const formData = new FormData();
  formData.append("title", payload.title);
  formData.append("owner_office_id", payload.owner_office_id.toString());
  formData.append("doctype", payload.doctype);

  if (payload.visibility_scope)
    formData.append("visibility_scope", payload.visibility_scope);
  if (payload.school_year) formData.append("school_year", payload.school_year);
  if (payload.semester) formData.append("semester", payload.semester);
  if (payload.description) formData.append("description", payload.description);
  if (payload.file) formData.append("file", payload.file);

  const token = localStorage.getItem("auth_token");
  if (!token) throw new Error("Not authenticated");

  const url = `${API_BASE}/documents`;

  return await new Promise<Document>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);

    xhr.setRequestHeader("Accept", "application/json");
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      const pct = Math.round((event.loaded / event.total) * 100);
      onProgress?.(pct);
    };

    xhr.onload = () => {
      if (xhr.status === 401) {
        clearAuthAndRedirect();
        return;
      }

      const ok = xhr.status >= 200 && xhr.status < 300;
      if (!ok) {
        try {
          const data = JSON.parse(xhr.responseText || "{}");
          const err: ApiError = new Error(
            data.message || `Request failed (${xhr.status})`,
          );
          err.status = xhr.status;
          if (data?.errors && typeof data.errors === "object")
            err.details = data.errors;
          reject(err);
        } catch {
          reject(new Error(`Request failed (${xhr.status})`));
        }
        return;
      }

      try {
        const json = JSON.parse(xhr.responseText || "{}");
        const doc = (json?.data ?? json) as Document;
        resolve(doc);
      } catch {
        reject(new Error("Invalid server response"));
      }
    };

    xhr.onerror = () => reject(new Error("Network error"));
    xhr.send(formData);
  });
}

export interface DocumentVersion {
  id: number;
  document_id: number;
  version_number: number;
  status: string;
  file_path: string | null;
  preview_path: string | null;
  original_filename: string | null;
  description?: string | null;
  distributed_at: string | null;
  superseded_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApiError extends Error {
  status?: number;
  details?: Record<string, string[]>;
}

export interface WorkflowTask {
  id: number;
  document_version_id: number;
  phase: "review" | "approval" | "registration";
  step: string;
  status: "open" | "completed" | "returned" | "rejected";
  opened_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  assigned_office_id?: number | null;
  assigned_role_id?: number | null;
  assigned_user_id?: number | null;
}

export interface DocumentMessageSender {
  id: number;
  full_name: string;
  profile_photo_path?: string | null;
  role?: { id: number; name: string } | null;
}

export interface DocumentMessage {
  id: number;
  document_version_id: number;
  sender_user_id: number;
  type: "comment" | "return_note" | "approval_note" | "system";
  message: string;
  created_at: string;
  updated_at: string;
  sender?: DocumentMessageSender | null;
}

export async function listDocumentMessages(
  versionId: number,
): Promise<DocumentMessage[]> {
  try {
    const res = await api.get(`/document-versions/${versionId}/messages`, {
      params: { t: Date.now() },
    });
    return res.data as DocumentMessage[];
  } catch (e: any) {
    const status = e?.response?.status;
    const msg =
      e?.response?.data?.message ||
      (status
        ? `Failed to load messages (${status})`
        : "Failed to load messages");
    throw new Error(msg);
  }
}

export async function postDocumentMessage(
  versionId: number,
  payload: { message: string; type?: DocumentMessage["type"] },
): Promise<DocumentMessage> {
  try {
    const res = await api.post(
      `/document-versions/${versionId}/messages`,
      payload,
    );
    return res.data as DocumentMessage;
  } catch (e: any) {
    const status = e?.response?.status;
    const msg =
      e?.response?.data?.message ||
      (status
        ? `Failed to send message (${status})`
        : "Failed to send message");
    throw new Error(msg);
  }
}

export async function listDocuments(): Promise<Document[]> {
  try {
    const res = await api.get("/documents");
    const data = res.data;
    const docs = Array.isArray(data) ? data : data?.data;

    if (!Array.isArray(docs)) {
      throw new Error("Invalid documents response format");
    }

    return docs as Document[];
  } catch (e: any) {
    const status = e?.response?.status;
    const msg =
      e?.response?.data?.message ||
      (status
        ? `Failed to load documents (${status})`
        : "Failed to load documents");
    throw new Error(msg);
  }
}

export async function getDocument(id: number): Promise<Document> {
  try {
    const res = await api.get(`/documents/${id}`, {
      params: { t: Date.now() },
    });
    const doc = res.data?.data ?? res.data;

    if (!doc || typeof doc !== "object") {
      throw new Error("Invalid document response format");
    }

    return doc as Document;
  } catch (e: any) {
    const status = e?.response?.status;
    const msg =
      e?.response?.data?.message ||
      (status
        ? `Failed to load document (${status})`
        : "Failed to load document");
    throw new Error(msg);
  }
}

export async function getDocumentVersions(
  documentId: number,
): Promise<DocumentVersion[]> {
  try {
    const res = await api.get(`/documents/${documentId}/versions`, {
      params: { t: Date.now() },
    });

    const data = res.data;
    const versions = Array.isArray(data) ? data : data?.data;

    if (!Array.isArray(versions)) {
      throw new Error("Invalid versions response format");
    }

    return versions as DocumentVersion[];
  } catch (e: any) {
    const status = e?.response?.status;
    const msg =
      e?.response?.data?.message ||
      (status
        ? `Failed to load document versions (${status})`
        : "Failed to load document versions");
    throw new Error(msg);
  }
}

export async function createRevision(
  documentId: number,
): Promise<DocumentVersion> {
  try {
    const res = await api.post(`/documents/${documentId}/revision`);
    return res.data as DocumentVersion;
  } catch (e: any) {
    const status = e?.response?.status;
    const msg =
      e?.response?.data?.message || (status ? `Failed (${status})` : "Failed");
    throw new Error(msg);
  }
}

export async function cancelRevision(versionId: number): Promise<void> {
  try {
    await api.post(`/document-versions/${versionId}/cancel`);
  } catch (e: any) {
    const status = e?.response?.status;
    const msg =
      e?.response?.data?.message || (status ? `Failed (${status})` : "Failed");
    throw new Error(msg);
  }
}

export async function deleteDraftVersion(versionId: number): Promise<void> {
  try {
    await api.delete(`/document-versions/${versionId}`);
  } catch (e: any) {
    const status = e?.response?.status;
    const msg =
      e?.response?.data?.message || (status ? `Failed (${status})` : "Failed");
    throw new Error(msg);
  }
}

export async function getDocumentVersion(
  versionId: number,
): Promise<{ version: DocumentVersion; document: Document }> {
  try {
    const res = await api.get(`/document-versions/${versionId}`, {
      params: { t: Date.now() },
    });

    const json = res.data;
    if (!json?.version || !json?.document) {
      throw new Error("Invalid document version response format");
    }

    return {
      version: json.version as DocumentVersion,
      document: (json.document.data ?? json.document) as Document,
    };
  } catch (e: any) {
    const status = e?.response?.status;
    const msg =
      e?.response?.data?.message ||
      (status
        ? `Failed to load document version (${status})`
        : "Failed to load document version");
    throw new Error(msg);
  }
}

export async function getDocumentPreviewUrl(
  versionId: number,
): Promise<string> {
  const { url } = await getDocumentPreviewLink(versionId);
  return url;
}

export async function replaceDocumentVersionFileWithProgress(
  versionId: number,
  file: File,
  onProgress?: (pct: number) => void,
): Promise<void> {
  const token = localStorage.getItem("auth_token");
  if (!token) throw new Error("Not authenticated");

  const formData = new FormData();
  formData.append("file", file);

  const url = `${API_BASE}/document-versions/${versionId}/replace-file`;

  return await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);

    xhr.setRequestHeader("Accept", "application/json");
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      const pct = Math.round((event.loaded / event.total) * 100);
      onProgress?.(pct);
    };

    xhr.onload = () => {
      const ok = xhr.status >= 200 && xhr.status < 300;
      if (ok) return resolve();
      if (xhr.status === 401) {
        clearAuthAndRedirect();
        return;
      }

      try {
        const data = JSON.parse(xhr.responseText || "{}");
        reject(new Error(data.message || `Upload failed (${xhr.status})`));
      } catch {
        reject(new Error(`Upload failed (${xhr.status})`));
      }
    };

    xhr.onerror = () => reject(new Error("Upload failed (network error)"));
    xhr.send(formData);
  });
}

export async function updateDocumentTitle(
  documentId: number,
  title: string,
): Promise<void> {
  try {
    await api.patch(`/documents/${documentId}`, { title });
  } catch (e: any) {
    const status = e?.response?.status;
    const msg =
      e?.response?.data?.message || (status ? `Failed (${status})` : "Failed");
    throw new Error(msg);
  }
}

export async function updateDocumentVersionDescription(
  versionId: number,
  description: string,
): Promise<DocumentVersion> {
  try {
    const res = await api.patch(`/document-versions/${versionId}`, {
      description,
    });
    const v = res.data?.version ?? res.data;
    return v as DocumentVersion;
  } catch (e: any) {
    const status = e?.response?.status;
    const msg =
      e?.response?.data?.message || (status ? `Failed (${status})` : "Failed");
    throw new Error(msg);
  }
}

export async function downloadDocument(
  version: DocumentVersion,
): Promise<void> {
  try {
    const res = await api.get(`/document-versions/${version.id}/download`, {
      responseType: "blob",
      headers: {
        Accept: "application/octet-stream",
      },
    });

    const blob = res.data as Blob;
    const objectUrl = window.URL.createObjectURL(blob);

    const a = window.document.createElement("a");
    a.href = objectUrl;
    a.download = version.original_filename || `document-version-${version.id}`;
    window.document.body.appendChild(a);
    a.click();
    a.remove();

    window.URL.revokeObjectURL(objectUrl);
  } catch (e: any) {
    const status = e?.response?.status;
    const msg =
      e?.response?.data?.message ||
      (status ? `Download failed (${status})` : "Download failed");
    throw new Error(msg);
  }
}

export interface Office {
  id: number;
  name: string;
  code: string;
  type: "office" | "academic";
  is_academic: boolean;
}

export async function listOffices(): Promise<Office[]> {
  try {
    const res = await api.get("/offices");
    return res.data as Office[];
  } catch (e: any) {
    const status = e?.response?.status;
    const msg =
      e?.response?.data?.message ||
      (status
        ? `Failed to load offices (${status})`
        : "Failed to load offices");
    throw new Error(msg);
  }
}

export const getCurrentUserOfficeId = (): number => {
  return getAuthUser()?.office?.id ?? 0;
};

export type WorkflowActionCode =
  | "SEND_TO_DEPT_REVIEW"
  | "FORWARD_TO_VPAA_REVIEW"
  | "VPAA_SEND_BACK_TO_QA_FINAL_CHECK"
  | "START_DEPT_APPROVAL"
  | "FORWARD_TO_VPAA_APPROVAL"
  | "FORWARD_TO_PRESIDENT_APPROVAL"
  | "FORWARD_TO_QA_REGISTRATION"
  | "FORWARD_TO_QA_DISTRIBUTION"
  | "MARK_DISTRIBUTED"
  | "RETURN_TO_QA_EDIT";

export type WorkflowActionResult = {
  version: DocumentVersion;
  action_message?: string;
  target_office?: { id: number; name: string; code: string } | null;
};

export async function submitWorkflowAction(
  versionId: number,
  action: WorkflowActionCode,
  note?: string,
): Promise<WorkflowActionResult> {
  try {
    const res = await api.post(`/document-versions/${versionId}/actions`, {
      action,
      note,
    });
    const data = res.data;
    if (data?.version) return data as WorkflowActionResult;
    return { version: data as DocumentVersion };
  } catch (e: any) {
    const status = e?.response?.status;
    const msg =
      e?.response?.data?.message ||
      (status ? `Request failed (${status})` : "Request failed");
    throw new Error(msg);
  }
}

export async function listWorkflowTasks(
  versionId: number,
): Promise<WorkflowTask[]> {
  try {
    const res = await api.get(`/document-versions/${versionId}/tasks`, {
      params: { t: Date.now() },
    });
    return res.data as WorkflowTask[];
  } catch (e: any) {
    const status = e?.response?.status;
    const msg =
      e?.response?.data?.message ||
      (status
        ? `Failed to load workflow tasks (${status})`
        : "Failed to load workflow tasks");
    throw new Error(msg);
  }
}

export async function getDocumentPreviewLink(
  versionId: number,
): Promise<{ url: string; expires_in_minutes: number }> {
  try {
    const res = await api.get(`/document-versions/${versionId}/preview-link`, {
      params: { t: Date.now() },
    });
    return res.data as { url: string; expires_in_minutes: number };
  } catch (e: any) {
    const status = e?.response?.status;
    const msg =
      e?.response?.data?.message ||
      (status
        ? `Failed to get preview link (${status})`
        : "Failed to get preview link");
    throw new Error(msg);
  }
}
