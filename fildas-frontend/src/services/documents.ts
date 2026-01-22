export interface CreateDocumentPayload {
  title: string;
  office_id: number;
  doctype: "internal" | "external" | "forms";
  current_step_notes?: string;
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
  parent_document_id: number | null;
  doctype: "internal" | "external" | "forms";
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
  const response = await fetch(
    `http://127.0.0.1:8000/api/documents/${id}?t=${Date.now()}`, // Cache bust
    {
      headers: {
        Accept: "application/json",
        'Cache-Control': 'no-cache',  // Force fresh
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to load document (${response.status})`);
  }

  const json = await response.json();
  return json as Document;
}

export async function getDocumentVersions(rootId: number): Promise<Document[]> {
  const allDocs: Document[] = [];
  
  // Load root
  const root = await getDocument(rootId);
  allDocs.push(root);
  
  // Load direct children recursively
  async function loadChildren(parentId: number) {
    const response = await fetch(`http://127.0.0.1:8000/api/documents?parent_document_id=${parentId}`, {
      headers: { Accept: "application/json" },
    });
    
    if (response.ok) {
      const children = await response.json() as Document[];
      for (const child of children) {
        allDocs.push(child);
        await loadChildren(child.id); // recursion for nested revisions
      }
    }
  }
  
  await loadChildren(rootId);
  
  // Sort by version_number numeric
  return allDocs.sort((a, b) => Number(a.version_number) - Number(b.version_number));
}

export interface ApiError extends Error {
  status?: number;
  details?: Record<string, string[]>;
}

export async function createDocument(
  payload: CreateDocumentPayload,
): Promise<Document> {
  const formData = new FormData();
  formData.append("title", payload.title);
  formData.append("office_id", payload.office_id.toString());
  formData.append("doctype", payload.doctype);

  if (payload.current_step_notes) {
    formData.append("current_step_notes", payload.current_step_notes);
  }

  if (payload.file) {
    formData.append("file", payload.file);
  }

const token = localStorage.getItem("auth_token");

  const response = await fetch("http://127.0.0.1:8000/api/documents", {
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
  return json as Document;
}

export function getDocumentPreviewUrl(id: number): string {
  return `http://127.0.0.1:8000/api/documents/${id}/preview`;
}

export interface Office {
  id: number;
  name: string;
  code: string;
  type: "office" | "academic";
  is_academic: boolean;
}

export async function listOffices(): Promise<Office[]> {
  const response = await fetch("http://127.0.0.1:8000/api/offices", {
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

// Get current user office from localStorage
export const getCurrentUserOfficeId = (): number => {
  try {
    const user = JSON.parse(localStorage.getItem('auth_user') || '{}');
    return user.office?.id || 0;
  } catch {
    return 0;
  }
};

