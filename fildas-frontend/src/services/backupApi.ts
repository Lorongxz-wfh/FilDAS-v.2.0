import { getApi, API_BASE } from "./_base";

export type BackupPreset = "today" | "this_week" | "this_month" | "custom" | "all";

export type BackupSummary = {
  documents: number;
  files: number;
  activities: number;
  users: number;
};

function buildParams(preset: BackupPreset, dateFrom?: string, dateTo?: string) {
  const p: Record<string, string> = { preset };
  if (preset === "custom") {
    if (dateFrom) p.date_from = dateFrom;
    if (dateTo) p.date_to = dateTo;
  }
  return p;
}

export async function getBackupSummary(
  preset: BackupPreset,
  dateFrom?: string,
  dateTo?: string,
): Promise<BackupSummary> {
  const api = await getApi();
  const res = await api.get("/backup/summary", {
    params: buildParams(preset, dateFrom, dateTo),
  });
  return res.data as BackupSummary;
}

/**
 * Trigger a file download for a backup endpoint.
 * Uses a hidden link + auth token in the URL since we need streaming downloads.
 */
export function downloadBackup(
  endpoint: "documents-csv" | "documents-zip" | "activity-csv" | "users-csv",
  preset: BackupPreset,
  dateFrom?: string,
  dateTo?: string,
): void {
  const params = new URLSearchParams(buildParams(preset, dateFrom, dateTo));
  const token = localStorage.getItem("auth_token") ?? "";

  // We can't use axios for file downloads easily, so we use a hidden iframe/link approach
  // But since the API requires Bearer auth, we'll use fetch + blob
  const url = `${API_BASE}/backup/${endpoint}?${params.toString()}`;

  fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: "*/*" },
  })
    .then((res) => {
      if (!res.ok) throw new Error(`Download failed (${res.status})`);

      // Extract filename from Content-Disposition header
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename[^;=\n]*=['"]*([^'";\n]*)/);
      const filename = match?.[1] ?? `fildas-backup-${endpoint}.${endpoint.includes("zip") ? "zip" : "csv"}`;

      return res.blob().then((blob) => ({ blob, filename }));
    })
    .then(({ blob, filename }) => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(a.href);
    })
    .catch((err) => {
      console.error("Backup download failed:", err);
      alert("Download failed. Please try again.");
    });
}
