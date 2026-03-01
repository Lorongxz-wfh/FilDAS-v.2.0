import api from "./api"; // adjust if your axios instance filename differs

export type DocumentRequestRow = {
  id: number;
  title: string;
  description: string | null;
  due_at: string | null;
  status: "open" | "closed" | "cancelled";
  example_original_filename?: string | null;
  example_file_path?: string | null;
  example_preview_path?: string | null;
  created_by_user_id?: number | null;
  created_at?: string;
  updated_at?: string;
};

export type DocumentRequestRecipientRow = {
  id: number;
  request_id: number;
  office_id: number;
  status: "pending" | "submitted" | "accepted" | "rejected";
  last_submitted_at: string | null;
  last_reviewed_at: string | null;
  office_name?: string;
  office_code?: string;
};

export async function listDocumentRequests(params?: {
  status?: "open" | "closed" | "cancelled";
  q?: string;
  per_page?: number;
}) {
  const res = await api.get("/document-requests", { params });
  return res.data;
}

export async function listDocumentRequestInbox(params?: {
  q?: string;
  per_page?: number;
}) {
  const res = await api.get("/document-requests/inbox", { params });
  return res.data;
}

export async function getDocumentRequest(requestId: number) {
  const res = await api.get(`/document-requests/${requestId}`);
  return res.data as {
    request: DocumentRequestRow & {
      office_id?: number | null;
      office_name?: string | null;
      office_code?: string | null;
    };
    recipient?: DocumentRequestRecipientRow | null;
  };
}

export async function createDocumentRequest(input: {
  title: string;
  description?: string | null;
  due_at?: string | null; // ISO or yyyy-mm-dd ok, backend uses date validation
  office_ids: number[];
  example_file?: File | null;
}) {
  const form = new FormData();
  form.append("title", input.title);
  if (input.description != null) form.append("description", input.description);
  if (input.due_at != null) form.append("due_at", input.due_at);

  // IMPORTANT: office_ids must be sent as array fields for Laravel
  for (const id of input.office_ids) form.append("office_ids[]", String(id));

  if (input.example_file) form.append("example_file", input.example_file);

  const res = await api.post("/document-requests", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data as { message: string; id: number };
}

export async function submitDocumentRequestEvidence(input: {
  request_id: number;
  recipient_id: number;
  note?: string | null;
  files: File[];
}) {
  const form = new FormData();
  if (input.note != null) form.append("note", input.note);
  for (const f of input.files) form.append("files[]", f);

  const res = await api.post(
    `/document-requests/${input.request_id}/recipients/${input.recipient_id}/submit`,
    form,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return res.data as { message: string; submission_id: number };
}

// Signed links (preview/download)
export async function getDocumentRequestExamplePreviewLink(requestId: number) {
  const res = await api.get(
    `/document-requests/${requestId}/example/preview-link`,
  );
  return res.data as { url: string; expires_in_minutes: number };
}

export async function getDocumentRequestExampleDownloadLink(requestId: number) {
  const res = await api.get(
    `/document-requests/${requestId}/example/download-link`,
  );
  return res.data as { url: string; expires_in_minutes: number };
}

export async function getDocumentRequestSubmissionFilePreviewLink(
  fileId: number,
) {
  const res = await api.get(
    `/document-request-submission-files/${fileId}/preview-link`,
  );
  return res.data as { url: string; expires_in_minutes: number };
}

export async function getDocumentRequestSubmissionFileDownloadLink(
  fileId: number,
) {
  const res = await api.get(
    `/document-request-submission-files/${fileId}/download-link`,
  );
  return res.data as { url: string; expires_in_minutes: number };
}

export async function reviewDocumentRequestSubmission(input: {
  submission_id: number;
  decision: "accepted" | "rejected";
  note?: string | null;
}) {
  const res = await api.post(
    `/document-request-submissions/${input.submission_id}/review`,
    {
      decision: input.decision,
      note: input.note ?? null,
    },
  );
  return res.data as { message: string };
}
