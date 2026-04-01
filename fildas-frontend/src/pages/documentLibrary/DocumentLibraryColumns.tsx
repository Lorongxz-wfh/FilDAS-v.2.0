import React from "react";
import type { TableColumn } from "../../components/ui/Table";
import type { Document } from "../../services/documents";
import { formatDate } from "../../utils/formatters";
import MiddleTruncate from "../../components/ui/MiddleTruncate";
import type { LibraryItem } from "./documentLibraryTypes";

// ── Reusable Cells ────────────────────────────────────────────────────────────

function NormalText({ children, secondary = false }: { children: React.ReactNode; secondary?: boolean }) {
  const content = typeof children === "object" && children !== null ? (children as any).code || (children as any).name || "—" : children;
  return (
    <span className={`text-xs ${secondary ? "text-slate-500 dark:text-slate-400" : "font-medium text-slate-700 dark:text-slate-100"}`}>
      {content || "—"}
    </span>
  );
}

function TypeText({ type }: { type: string }) {
  return (
    <span className="text-xs text-slate-500 dark:text-slate-400 capitalize">
      {type?.toLowerCase() || "—"}
    </span>
  );
}

// ── Column builders ───────────────────────────────────────────────────────────

export function buildCreatedColumns(): TableColumn<Document>[] {
  return [
    {
      key: "code",
      header: "Code",
      sortKey: "code",
      skeletonShape: "narrow",
      render: (doc) => (
        <span className="font-mono text-xs font-semibold text-slate-500 dark:text-slate-400">
          {doc.code || "—"}
        </span>
      ),
    },
    {
      key: "title",
      header: "Document Title",
      skeletonShape: "text",
      sortKey: "title",
      render: (doc) => (
        <div className="min-w-0 pr-4">
          <MiddleTruncate 
            text={doc.title}
            className="text-sm font-semibold text-slate-800 dark:text-slate-100 group-hover:text-brand-500 transition-colors"
          />
        </div>
      ),
    },
    {
      key: "type",
      header: "Type",
      skeletonShape: "text",
      render: (doc) => <TypeText type={doc.doctype} />,
    },
    {
      key: "office",
      header: "Office",
      skeletonShape: "text",
      render: (doc: any) => (
        <NormalText secondary>
          {doc.office?.code || doc.ownerOffice?.code || "—"}
        </NormalText>
      ),
    },
    {
        key: "version",
        header: "Ver.",
        align: "center",
        skeletonShape: "narrow",
        render: (doc) => (
          <NormalText secondary>v{doc.version_number}</NormalText>
        ),
    },
    {
      key: "date_distributed",
      header: "Date Distributed",
      skeletonShape: "narrow",
      sortKey: "created_at",
      align: "right",
      render: (doc) => (
        <NormalText secondary>
          {formatDate(doc.effective_date || doc.created_at)}
        </NormalText>
      ),
    },
  ];
}

export function buildSharedColumns(): TableColumn<Document>[] {
  return [
    {
      key: "code",
      header: "Code",
      sortKey: "code",
      skeletonShape: "narrow",
      render: (doc) => (
        <span className="font-mono text-xs font-semibold text-slate-500 dark:text-slate-400">
          {doc.code || "—"}
        </span>
      ),
    },
    {
      key: "title",
      header: "Document Title",
      skeletonShape: "text",
      sortKey: "title",
      render: (doc) => (
        <div className="min-w-0 pr-4">
          <MiddleTruncate 
            text={doc.title}
            className="text-sm font-semibold text-slate-800 dark:text-slate-100 group-hover:text-brand-500 transition-colors"
          />
        </div>
      ),
    },
    {
      key: "type",
      header: "Type",
      skeletonShape: "text",
      render: (doc) => <TypeText type={doc.doctype} />,
    },
    {
      key: "office",
      header: "Office",
      skeletonShape: "text",
      render: (doc: any) => (
        <NormalText secondary>
          {doc.office?.code || doc.ownerOffice?.code || "—"}
        </NormalText>
      ),
    },
    {
        key: "version",
        header: "Ver.",
        align: "center",
        skeletonShape: "narrow",
        render: (doc) => (
          <NormalText secondary>v{doc.version_number}</NormalText>
        ),
    },
    {
      key: "date_distributed",
      header: "Date Distributed",
      skeletonShape: "narrow",
      align: "right",
      render: (doc) => (
        <NormalText secondary>
          {formatDate(doc.effective_date)}
        </NormalText>
      ),
    },
    {
      key: "date_shared",
      header: "Date Shared",
      skeletonShape: "narrow",
      sortKey: "created_at",
      align: "right",
      render: (doc) => (
        <NormalText secondary>
          {formatDate(doc.created_at)}
        </NormalText>
      ),
    },
  ];
}

// Map old names to new unified builder with correct headers
export const buildBaseDocColumns = () => buildCreatedColumns();

export function buildRequestedColumns(isQaAdmin: boolean): TableColumn<any>[] {
  const cols: TableColumn<any>[] = [
    {
      key: "type",
      header: "Type",
      skeletonShape: "text",
      render: (r) => <TypeText type={r.batch_mode || "REQUEST"} />,
    },
    {
      key: "request",
      header: "Request Title",
      skeletonShape: "text",
      sortKey: "title",
      render: (r) => (
        <div className="min-w-0 pr-4">
          <MiddleTruncate 
            text={r.item_title ?? r.batch_title}
            className="text-sm font-semibold text-slate-800 dark:text-slate-100 group-hover:text-brand-500 transition-colors"
          />
          {r.item_title && r.batch_title && (
            <MiddleTruncate 
              text={r.batch_title}
              className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5"
            />
          )}
        </div>
      ),
    },
  ];

  if (isQaAdmin) {
    cols.push({
      key: "office",
      header: "Office",
      skeletonShape: "text",
      render: (r) => (
        <NormalText secondary>
          {r.office_code || "—"}
        </NormalText>
      ),
    });
  }

  cols.push(
    {
      key: "status",
      header: "Status",
      skeletonShape: "text",
      render: () => <NormalText>Accepted</NormalText>,
    },
    {
      key: "date",
      header: "Date Accepted",
      skeletonShape: "narrow",
      sortKey: "created_at",
      align: "right",
      render: (r) => (
        <NormalText secondary>
          {formatDate(r.created_at)}
        </NormalText>
      ),
    },
  );

  return cols;
}

export function buildAllColumns(): TableColumn<LibraryItem>[] {
  return [
    {
      key: "source",
      header: "Source",
      skeletonShape: "narrow",
      render: (item) => (
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 dark:bg-surface-600 dark:text-slate-400 px-1.5 py-0.5 rounded">
          {item.source}
        </span>
      ),
    },
    {
      key: "title",
      header: "Title",
      skeletonShape: "text",
      sortKey: "title",
      render: (item) => (
        <div className="min-w-0 pr-4">
          <MiddleTruncate 
            text={item.title}
            className="text-sm font-semibold text-slate-800 dark:text-slate-100 group-hover:text-brand-500 transition-colors"
          />
          {item.code && (
              <p className="text-[10px] font-mono text-slate-400 dark:text-slate-500 mt-0.5">{item.code}</p>
          )}
        </div>
      ),
    },
    {
      key: "type",
      header: "Type",
      skeletonShape: "text",
      render: (item) => <TypeText type={item.doctype || item.mode || "—"} />,
    },
    {
      key: "office",
      header: "Office",
      skeletonShape: "text",
      render: (item: any) => {
        const off = item.office;
        const display = typeof off === "object" && off !== null ? off.code || off.name : off;
        return (
          <NormalText secondary>
            {display}
          </NormalText>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      skeletonShape: "text",
      render: (item) => (
        <NormalText>
          {item.status || "—"}
        </NormalText>
      ),
    },
    {
      key: "distributed",
      header: "Distributed",
      skeletonShape: "narrow",
      align: "right",
      render: (item) => (
        <NormalText secondary>
          {formatDate(item.dateDistributed || item.date)}
        </NormalText>
      ),
    },
    {
      key: "shared",
      header: "Shared",
      skeletonShape: "narrow",
      align: "right",
      render: (item) => (
        <NormalText secondary>
          {item.dateShared ? formatDate(item.dateShared) : "—"}
        </NormalText>
      ),
    },
  ];
}

export function buildArchiveColumns(): TableColumn<Document>[] {
  return [
    {
      key: "code",
      header: "Code",
      sortKey: "code",
      skeletonShape: "narrow",
      render: (doc) => (
        <span className="font-mono text-xs font-semibold text-slate-500 dark:text-slate-400">
          {doc.code || "—"}
        </span>
      ),
    },
    {
      key: "title",
      header: "Document Title",
      skeletonShape: "text",
      sortKey: "title",
      render: (doc) => (
        <div className="min-w-0 pr-4">
          <MiddleTruncate 
            text={doc.title}
            className="text-sm font-semibold text-slate-800 dark:text-slate-100 group-hover:text-brand-500 transition-colors"
          />
        </div>
      ),
    },
    {
      key: "type",
      header: "Type",
      skeletonShape: "text",
      render: (doc) => <TypeText type={doc.doctype} />,
    },
    {
      key: "office",
      header: "Office",
      skeletonShape: "text",
      render: (doc: any) => (
        <NormalText secondary>
          {doc.office?.code || doc.ownerOffice?.code || "—"}
        </NormalText>
      ),
    },
    {
      key: "status",
      header: "Status",
      skeletonShape: "text",
      render: (doc: any) => (
        <NormalText>
          {doc.status || "—"}
        </NormalText>
      ),
    },
    {
      key: "archived_on",
      header: "Date",
      skeletonShape: "narrow",
      sortKey: "updated_at",
      align: "right",
      render: (doc) => (
        <NormalText secondary>
          {doc.updated_at ? formatDate(doc.updated_at) : "—"}
        </NormalText>
      ),
    },
  ];
}
