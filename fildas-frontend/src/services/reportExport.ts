import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type {
  ComplianceKpis,
  ComplianceVolumeSeriesDatum,
  ComplianceSeriesDatum,
  ComplianceOfficeDatum,
  ComplianceStageDelayDatum,
} from "./documents";
import type { ComplianceClusterDatum } from "../components/charts/ComplianceClusterBarChart";

const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0);

// ── CSV helpers ────────────────────────────────────────────────────────────────

async function saveBlob(blob: Blob, filename: string, mimeType: string) {
  // Try File System Access API (Chrome/Edge)
  if ("showSaveFilePicker" in window) {
    try {
      const ext = filename.split(".").pop() ?? "";
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: filename,
        types: [{ description: mimeType, accept: { [mimeType]: [`.${ext}`] } }],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return;
    } catch (e: any) {
      // User cancelled — don't fallback
      if (e?.name === "AbortError") return;
      // Other error — fallback to auto-download
    }
  }
  // Fallback
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadCsv(
  filename: string,
  headers: string[],
  rows: (string | number)[][],
) {
  const lines = [
    headers.join(","),
    ...rows.map((r) =>
      r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","),
    ),
  ];
  const blob = new Blob([lines.join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  saveBlob(blob, filename, "text/csv");
}

// ── PDF helpers ────────────────────────────────────────────────────────────────

async function savePdf(doc: jsPDF, filename: string) {
  const blob = doc.output("blob");
  await saveBlob(blob, filename, "application/pdf");
}

function makePdf(title: string): jsPDF {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  doc.setFontSize(14);
  doc.setTextColor(30, 41, 59);
  doc.text(`FilDAS Report — ${title}`, 14, 16);
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 22);
  return doc;
}

// ── KPI Summary ────────────────────────────────────────────────────────────────

export function exportKpiCsv(
  kpis: ComplianceKpis,
  totals: { in_review: number; approved: number; returned: number },
) {
  downloadCsv(
    "fildas_kpi_summary.csv",
    ["Metric", "Value"],
    [
      ["Total created", kpis.total_created],
      ["Total distributed", kpis.total_approved_final],
      [
        "Completion rate (%)",
        pct(kpis.total_approved_final, kpis.total_created),
      ],
      ["Entered review", totals.in_review],
      ["Final approved", totals.approved],
      ["Approval rate (%)", pct(totals.approved, totals.in_review)],
      ["Returned for edits", totals.returned],
      ["Return rate (%)", pct(totals.returned, totals.in_review)],
      ["First-pass yield (%)", kpis.first_pass_yield_pct],
      ["Ping-pong ratio", kpis.pingpong_ratio],
      ["Avg cycle time (days)", kpis.cycle_time_avg_days],
    ],
  );
}

export async function exportKpiPdf(
  kpis: ComplianceKpis,
  totals: { in_review: number; approved: number; returned: number },
) {
  const doc = makePdf("KPI Summary");
  autoTable(doc, {
    startY: 28,
    head: [["Metric", "Value"]],
    body: [
      ["Total created", kpis.total_created],
      ["Total distributed", kpis.total_approved_final],
      [
        "Completion rate",
        `${pct(kpis.total_approved_final, kpis.total_created)}%`,
      ],
      ["Entered review", totals.in_review],
      ["Final approved", totals.approved],
      ["Approval rate", `${pct(totals.approved, totals.in_review)}%`],
      ["Returned for edits", totals.returned],
      ["Return rate", `${pct(totals.returned, totals.in_review)}%`],
      ["First-pass yield", `${kpis.first_pass_yield_pct}%`],
      ["Ping-pong ratio", kpis.pingpong_ratio],
      ["Avg cycle time", `${kpis.cycle_time_avg_days} days`],
    ],
    styles: { fontSize: 10 },
    headStyles: { fillColor: [14, 165, 233] },
  });
  await savePdf(doc,"fildas_kpi_summary.pdf");
}

// ── Volume Trend ───────────────────────────────────────────────────────────────

export function exportVolumeCsv(data: ComplianceVolumeSeriesDatum[]) {
  downloadCsv(
    "fildas_volume_trend.csv",
    ["Period", "Created", "Distributed"],
    data.map((r) => [r.label, r.created, r.approved_final]),
  );
}

export async function exportVolumePdf(data: ComplianceVolumeSeriesDatum[]) {
  const doc = makePdf("Volume Trend");
  autoTable(doc, {
    startY: 28,
    head: [["Period", "Created", "Distributed"]],
    body: data.map((r) => [r.label, r.created, r.approved_final]),
    styles: { fontSize: 10 },
    headStyles: { fillColor: [14, 165, 233] },
  });
  await savePdf(doc,"fildas_volume_trend.pdf");
}

// ── Cluster Compliance ─────────────────────────────────────────────────────────

export function exportClusterCsv(data: ComplianceClusterDatum[]) {
  downloadCsv(
    "fildas_cluster_compliance.csv",
    ["Cluster", "In Review", "Approved", "Approval %", "Returned", "Return %"],
    data.map((r) => [
      r.cluster,
      r.in_review,
      r.approved,
      `${pct(r.approved, r.in_review)}%`,
      r.returned,
      `${pct(r.returned, r.in_review)}%`,
    ]),
  );
}

export async function exportClusterPdf(data: ComplianceClusterDatum[]) {
  const doc = makePdf("Cluster Compliance");
  autoTable(doc, {
    startY: 28,
    head: [
      [
        "Cluster",
        "In Review",
        "Approved",
        "Approval %",
        "Returned",
        "Return %",
      ],
    ],
    body: data.map((r) => [
      r.cluster,
      r.in_review,
      r.approved,
      `${pct(r.approved, r.in_review)}%`,
      r.returned,
      `${pct(r.returned, r.in_review)}%`,
    ]),
    styles: { fontSize: 10 },
    headStyles: { fillColor: [14, 165, 233] },
  });
  await savePdf(doc,"fildas_cluster_compliance.pdf");
}

// ── Office Compliance ──────────────────────────────────────────────────────────

export function exportOfficeCsv(data: ComplianceOfficeDatum[]) {
  downloadCsv(
    "fildas_office_compliance.csv",
    [
      "Office",
      "Cluster",
      "In Review",
      "Approved",
      "Approval %",
      "Returned",
      "Return %",
    ],
    data.map((r) => [
      r.office_code ?? `Office #${r.office_id}`,
      r.cluster ?? "—",
      r.in_review,
      r.approved,
      `${pct(r.approved, r.in_review)}%`,
      r.returned,
      `${pct(r.returned, r.in_review)}%`,
    ]),
  );
}

export async function exportOfficePdf(data: ComplianceOfficeDatum[]) {
  const doc = makePdf("Office Compliance");
  autoTable(doc, {
    startY: 28,
    head: [
      [
        "Office",
        "Cluster",
        "In Review",
        "Approved",
        "Approval %",
        "Returned",
        "Return %",
      ],
    ],
    body: data.map((r) => [
      r.office_code ?? `Office #${r.office_id}`,
      r.cluster ?? "—",
      r.in_review,
      r.approved,
      `${pct(r.approved, r.in_review)}%`,
      r.returned,
      `${pct(r.returned, r.in_review)}%`,
    ]),
    styles: { fontSize: 10 },
    headStyles: { fillColor: [14, 165, 233] },
  });
  await savePdf(doc,"fildas_office_compliance.pdf");
}

// ── Stage Delays ───────────────────────────────────────────────────────────────

export function exportStageDelayCsv(data: ComplianceStageDelayDatum[]) {
  downloadCsv(
    "fildas_stage_delays.csv",
    ["Stage", "Avg Hours", "Versions Count", "Task Count"],
    data.map((r) => [r.stage, r.avg_hours, r.count, r.task_count]),
  );
}

export async function exportStageDelayPdf(data: ComplianceStageDelayDatum[]) {
  const doc = makePdf("Stage Delays");
  autoTable(doc, {
    startY: 28,
    head: [["Stage", "Avg Hours", "Versions Count", "Task Count"]],
    body: data.map((r) => [r.stage, r.avg_hours, r.count, r.task_count]),
    styles: { fontSize: 10 },
    headStyles: { fillColor: [14, 165, 233] },
  });
  await savePdf(doc,"fildas_stage_delays.pdf");
}

// ── Approval Timeline ──────────────────────────────────────────────────────────

export function exportTimelineCsv(data: ComplianceSeriesDatum[]) {
  downloadCsv(
    "fildas_approval_timeline.csv",
    ["Period", "In Review", "Sent to QA", "Distributed", "Returned"],
    data.map((r) => [
      r.label,
      r.in_review,
      r.sent_to_qa,
      r.approved,
      r.returned,
    ]),
  );
}

export async function exportTimelinePdf(data: ComplianceSeriesDatum[]) {
  const doc = makePdf("Approval Timeline");
  autoTable(doc, {
    startY: 28,
    head: [["Period", "In Review", "Sent to QA", "Distributed", "Returned"]],
    body: data.map((r) => [
      r.label,
      r.in_review,
      r.sent_to_qa,
      r.approved,
      r.returned,
    ]),
    styles: { fontSize: 10 },
    headStyles: { fillColor: [14, 165, 233] },
  });
  await savePdf(doc,"fildas_approval_timeline.pdf");
}
