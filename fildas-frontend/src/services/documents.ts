import { getAuthUser } from "../lib/auth";


const API_BASE = "http://127.0.0.1:8000/api";

function getAuthToken(): string {
  const token = localStorage.getItem("auth_token");
  if (!token) throw new Error("Not authenticated");
  return token;
}

export interface CreateDocumentPayload {
  title: string;
  owner_office_id: number;
  doctype: "internal" | "external" | "forms";
  visibility_scope?: "office" | "global";
  school_year?: string;
  semester?: string;
  file?: File | null;
}


export interface Document {
  id: number;
  title: string;
  office_id: number | null;
  office: {     // ← ADD
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

  if (payload.visibility_scope) formData.append("visibility_scope", payload.visibility_scope);
  if (payload.school_year) formData.append("school_year", payload.school_year);
  if (payload.semester) formData.append("semester", payload.semester);
  if (payload.file) formData.append("file", payload.file);

  const token = getAuthToken();

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
      const ok = xhr.status >= 200 && xhr.status < 300;
      if (!ok) {
        try {
          const data = JSON.parse(xhr.responseText || "{}");
          const err: ApiError = new Error(data.message || `Request failed (${xhr.status})`);
          err.status = xhr.status;
          if (data?.errors && typeof data.errors === "object") err.details = data.errors;
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

export async function listDocumentMessages(versionId: number): Promise<DocumentMessage[]> {
const token = getAuthToken();

const res = await fetch(
  `${API_BASE}/document-versions/${versionId}/messages?t=${Date.now()}`,

  {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  },
);

  if (!res.ok) {
    let msg = `Failed to load messages (${res.status})`;
    try {
      const j = await res.json();
      if (j?.message) msg = j.message;
    } catch {}
    throw new Error(msg);
  }

  return (await res.json()) as DocumentMessage[];
}

export async function postDocumentMessage(
  versionId: number,
  payload: { message: string; type?: DocumentMessage["type"] },
): Promise<DocumentMessage> {
const token = getAuthToken();

const res = await fetch(`${API_BASE}/document-versions/${versionId}/messages`, {

    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    let msg = `Failed to send message (${res.status})`;
    try {
      const j = await res.json();
      if (j?.message) msg = j.message;
    } catch {}
    throw new Error(msg);
  }

  return (await res.json()) as DocumentMessage;
}

export async function listDocuments(): Promise<Document[]> {
  const token = getAuthToken();

  const response = await fetch(`${API_BASE}/documents`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to load documents (${response.status})`);
  }

  const json = await response.json();
  const docs = Array.isArray(json) ? json : json?.data;

  if (!Array.isArray(docs)) {
    throw new Error("Invalid documents response format");
  }

  return docs as Document[];
}

export async function getDocument(id: number): Promise<Document> {
  const token = getAuthToken();

  const response = await fetch(
    `${API_BASE}/documents/${id}?t=${Date.now()}`,
    {
      headers: {
        Accept: "application/json",
        "Cache-Control": "no-cache",
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to load document (${response.status})`);
  }

  const json = await response.json();
  const doc = (json?.data ?? json);

  if (!doc || typeof doc !== "object") {
    throw new Error("Invalid document response format");
  }

  return doc as Document;

}

export async function getDocumentVersions(documentId: number): Promise<DocumentVersion[]> {
  const token = getAuthToken();

  const response = await fetch(
    `${API_BASE}/documents/${documentId}/versions?t=${Date.now()}`,
    {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    }
  );


  if (!response.ok) {
    throw new Error(`Failed to load document versions (${response.status})`);
  }

  const json = await response.json();
const versions = Array.isArray(json) ? json : json?.data;

if (!Array.isArray(versions)) {
  throw new Error("Invalid versions response format");
}

return versions as DocumentVersion[];

}

export async function createRevision(documentId: number): Promise<DocumentVersion> {
  const token = getAuthToken();

  const res = await fetch(`${API_BASE}/documents/${documentId}/revision`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Failed (${res.status})`);
  }

  return (await res.json()) as DocumentVersion;
}

export async function cancelRevision(versionId: number): Promise<void> {
  const token = getAuthToken();

  const res = await fetch(`${API_BASE}/document-versions/${versionId}/cancel`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Failed (${res.status})`);
  }
}

export async function deleteDraftVersion(versionId: number): Promise<void> {
  const token = getAuthToken();

  const res = await fetch(`${API_BASE}/document-versions/${versionId}`, {
    method: "DELETE",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Failed (${res.status})`);
  }
}

export async function getDocumentVersion(versionId: number): Promise<{ version: DocumentVersion; document: Document }> {
  const token = getAuthToken();

  const response = await fetch(
    `${API_BASE}/document-versions/${versionId}?t=${Date.now()}`,
    {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to load document version (${response.status})`);
  }

  const json = await response.json();
  if (!json?.version || !json?.document) {
    throw new Error("Invalid document version response format");
  }

  return { version: json.version as DocumentVersion, document: (json.document.data ?? json.document) as Document };
}

export async function createDocument(
  payload: CreateDocumentPayload,
): Promise<Document> {
  const formData = new FormData();
formData.append("title", payload.title);
formData.append("owner_office_id", payload.owner_office_id.toString());
formData.append("doctype", payload.doctype);

if (payload.visibility_scope) formData.append("visibility_scope", payload.visibility_scope);
if (payload.school_year) formData.append("school_year", payload.school_year);
if (payload.semester) formData.append("semester", payload.semester);


  if (payload.file) {
    formData.append("file", payload.file);
  }

const token = getAuthToken();

  const response = await fetch(`${API_BASE}/documents`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      // Do NOT set Content-Type for multipart
    },
    body: formData,
  });

  if (!response.ok) {
    let message = "Request failed";
    let details: Record<string, string[]> | undefined;

    try {
      const data = await response.json();
      if (data?.message) {
        message = data.message;
      }
      if (data?.errors && typeof data.errors === "object") {
        details = data.errors;
      }
    } catch {
      message = `Request failed with status ${response.status}`;
    }

    const error: ApiError = new Error(message);
    error.status = response.status;
    if (details) {
      error.details = details;
    }
    throw error;
  }

  const json = await response.json();
  const doc = (json?.data ?? json);
  return doc as Document;
}

export function getDocumentPreviewUrl(versionId: number): string {
  return `${API_BASE}/document-versions/${versionId}/preview`;
}

export async function replaceDocumentVersionFileWithProgress(
  versionId: number,
  file: File,
  onProgress?: (pct: number) => void,
): Promise<void> {
  const token = getAuthToken();

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
  const token = getAuthToken();

  const res = await fetch(`${API_BASE}/documents/${documentId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ title }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Failed (${res.status})`);
  }
}


export async function downloadDocument(version: DocumentVersion): Promise<void> {
const token = getAuthToken();
const url = `${API_BASE}/document-versions/${version.id}/download`;


  const res = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/octet-stream",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    let msg = `Download failed (${res.status})`;
    try {
      const j = await res.json();
      if (j?.message) msg = j.message;
    } catch {}
    throw new Error(msg);
  }

  const blob = await res.blob();
  const objectUrl = window.URL.createObjectURL(blob);

  const a = window.document.createElement("a");
  a.href = objectUrl;
  a.download = version.original_filename || `document-version-${version.id}`;
  window.document.body.appendChild(a);
  a.click();
  a.remove();

  window.URL.revokeObjectURL(objectUrl);
}

export interface Office {
  id: number;
  name: string;
  code: string;
  type: "office" | "academic";
  is_academic: boolean;
}

export async function listOffices(): Promise<Office[]> {
  const response = await fetch(`${API_BASE}/offices`, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to load offices (${response.status})`);
  }

  const json = await response.json();
  return json as Office[];
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

export async function submitWorkflowAction(
  versionId: number,
  action: WorkflowActionCode,
  note?: string,
): Promise<DocumentVersion> {

const token = getAuthToken();

const res = await fetch(`${API_BASE}/document-versions/${versionId}/actions`, {

    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ action, note }),
  });

  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const j = await res.json();
      if (j?.message) msg = j.message;
    } catch {}
    throw new Error(msg);
  }

  const json = await res.json();
  return json.version as DocumentVersion;
}

export async function listWorkflowTasks(versionId: number): Promise<WorkflowTask[]> {
  const token = getAuthToken();

  const url = `${API_BASE}/document-versions/${versionId}/tasks?t=${Date.now()}`;
  console.log("[Workflow] GET", url);

  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });


  if (!res.ok) {
    let msg = `Failed to load workflow tasks (${res.status})`;
    try {
      const j = await res.json();
      if (j?.message) msg = j.message;
    } catch {}
    throw new Error(msg);
  }

  return (await res.json()) as WorkflowTask[];
}

export async function getDocumentPreviewLink(versionId: number): Promise<{ url: string; expires_in_minutes: number }> {
  const token = getAuthToken();

  const res = await fetch(`${API_BASE}/document-versions/${versionId}/preview-link?t=${Date.now()}`, {
    headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    let msg = `Failed to get preview link (${res.status})`;
    try {
      const j = await res.json();
      if (j?.message) msg = j.message;
    } catch {}
    throw new Error(msg);
  }

  return (await res.json()) as { url: string; expires_in_minutes: number };
}
