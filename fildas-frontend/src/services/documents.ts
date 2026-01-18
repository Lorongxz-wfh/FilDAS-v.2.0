export interface CreateDocumentPayload {
  title: string;
  office_code: string;
  doc_type_code: string;
  current_step_notes?: string;
  file?: File | null;
}

export interface Document {
  id: number;
  title: string;
  office_code: string;
  doc_type_code: string;
  code: string | null;
  status: string;
  version_number: string;
  file_path: string | null;
  preview_path: string | null;
  original_filename: string | null;
  current_step_notes: string | null;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

export async function listDocuments(): Promise<Document[]> {
  const response = await fetch("http://127.0.0.1:8000/api/documents", {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to load documents (${response.status})`);
  }

  const json = await response.json();
  return json as Document[];
}

export async function getDocument(id: number): Promise<Document> {
  const response = await fetch(`http://127.0.0.1:8000/api/documents/${id}`, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to load document (${response.status})`);
  }

  const json = await response.json();
  return json as Document;
}

export interface ApiError extends Error {
  status?: number;
  details?: Record<string, string[]>;
}

export async function createDocument(payload: CreateDocumentPayload): Promise<Document> {
  const formData = new FormData();
  formData.append("title", payload.title);
  formData.append("office_code", payload.office_code);
  formData.append("doc_type_code", payload.doc_type_code);
  if (payload.current_step_notes) {
    formData.append("current_step_notes", payload.current_step_notes);
  }
  if (payload.file) {
    formData.append("file", payload.file);
  }

  const response = await fetch("http://127.0.0.1:8000/api/documents", {
    method: "POST",
    headers: {
      Accept: "application/json",
      // Do NOT set Content-Type; browser will set multipart boundary.
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
  return json as Document;
}

export function getDocumentPreviewUrl(id: number): string {
  return `http://127.0.0.1:8000/api/documents/${id}/preview`;
}

