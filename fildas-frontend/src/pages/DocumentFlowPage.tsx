import React, { useEffect, useState } from "react";
import {
  getDocument,
  getDocumentVersions,
  getDocumentVersion,
  logOpenedVersion,
  type Document,
  type DocumentVersion,
} from "../services/documents";
import DocumentFlow from "../components/documents/DocumentFlow";
import ShareDocumentModal from "../components/documents/ShareDocumentModal";
import ActionConfirmModal from "../components/documents/documentFlow/ActionConfirmModal";
import RevisionModal from "../components/documents/documentFlow/RevisionModal";
import {
  useNavigate,
  useLocation,
  useParams,
  useSearchParams,
} from "react-router-dom";
import Alert from "../components/ui/Alert";
import Button from "../components/ui/Button";
import RefreshButton from "../components/ui/RefreshButton";
import DocFrame from "../components/layout/DocFrame";
import DocumentRightPanel from "../components/documents/documentFlow/DocumentRightPanel";
import VersionsDropdown from "../components/documents/documentFlow/VersionsDropdown";
import BackButton from "../components/ui/buttons/BackButton";
import Skeleton from "../components/ui/loader/Skeleton";
import { replaceDocumentVersionFileWithProgress } from "../services/documents";
import { useToast } from "../components/ui/toast/ToastContext";
import { getUserRole } from "../lib/roleFilters";
import { getAuthUser } from "../lib/auth";
import { Library, Loader2, Copy, Check } from "lucide-react";

const DocumentFlowPage: React.FC = () => {
  const params = useParams();
  const id = Number(params.id);
  const navigate = useNavigate();

  const role = getUserRole();
  const isAdmin = role === "ADMIN" || role === "SYSADMIN";
  const currentUserId = getAuthUser()?.id;
  const myOfficeId = getAuthUser()?.office_id ?? null;
  const debugKey = `pref_debug_mode_${currentUserId}`;

  const [adminDebugMode, setAdminDebugMode] = React.useState<boolean>(() =>
    isAdmin ? localStorage.getItem(debugKey) === "1" : false,
  );

  React.useEffect(() => {
    if (!isAdmin) return;
    const sync = () => setAdminDebugMode(localStorage.getItem(debugKey) === "1");
    window.addEventListener("admin_debug_mode_changed", sync);
    return () => window.removeEventListener("admin_debug_mode_changed", sync);
  }, [isAdmin, debugKey]);

  const location = useLocation();
  const fromPath: string = (location.state as any)?.from ?? "/work-queue";
  // If came from a doc view page, go back there; if from library, go to library; else work queue
  const backTo =
    fromPath.startsWith("/documents/") && fromPath.includes("/view")
      ? fromPath
      : fromPath === "/documents"
        ? "/documents"
        : "/work-queue";

  const handleBack = () => {
    navigate(backTo);
  };

  const [document, setDocument] = useState<Document | null>(null);
  const [allVersions, setAllVersions] = useState<DocumentVersion[]>([]);
  const [headerState, setHeaderState] = useState<{
    title: string;
    code: string;
    status: string;
    versionNumber: number;
    canAct: boolean;
    isTasksReady: boolean;
    headerActions: any[];
    versionActions: any[];
  } | null>(null);

  const headerSigRef = React.useRef<string>("");

  const [selectedVersion, setSelectedVersion] =
    useState<DocumentVersion | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const selectedVersionParam = searchParams.get("version_id");
  const selectedVersionIdFromUrl = selectedVersionParam
    ? Number(selectedVersionParam)
    : null;
  const selectedVersionId =
    selectedVersionIdFromUrl && !Number.isNaN(selectedVersionIdFromUrl)
      ? selectedVersionIdFromUrl
      : null;
  const [isLoadingSelectedVersion, setIsLoadingSelectedVersion] =
    useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [reviseModalOpen, setReviseModalOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [rightPanelContent, setRightPanelContent] =
    useState<React.ReactNode>(null);
  const rightPanelShell = React.useMemo(
    () => (
      <DocumentRightPanel
        document={null}
        version={null}
        offices={[]}
        newMessageCount={0}
        clearNewMessageCount={() => {}}
        activeSideTab="comments"
        setActiveSideTab={() => {}}
        isLoadingActivityLogs={true}
        activityLogs={[]}
        isLoadingMessages={true}
        messages={[]}
        draftMessage=""
        setDraftMessage={() => {}}
        isSendingMessage={false}
        onSendMessage={async () => {}}
        formatWhen={() => ""}
        optimisticMessages={[]}
        setOptimisticMessages={() => {}}
      />
    ),
    [],
  );
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  // ── Pending file upload (from create page async redirect) ─────────────────
  const toast = useToast();
  const [pendingUploadPct, setPendingUploadPct] = useState<number | null>(null);
  const pendingFileRef = React.useRef<File | null>(
    (location.state as any)?.pendingFile ?? null,
  );

  useEffect(() => {
    const file = pendingFileRef.current;
    if (!file || !selectedVersion) return;
    // Clear from location state so back-nav doesn't re-trigger
    window.history.replaceState(
      { ...(window.history.state ?? {}), pendingFile: undefined },
      "",
    );
    pendingFileRef.current = null;
    setPendingUploadPct(0);
    replaceDocumentVersionFileWithProgress(selectedVersion.id, file, (pct) =>
      setPendingUploadPct(pct),
    )
      .then(() => {
        setPendingUploadPct(null);
        toast.push({ type: "success", message: "File uploaded successfully." });
        return refreshAndSelectBest({ preferVersionId: selectedVersion.id });
      })
      .catch((err: any) => {
        setPendingUploadPct(null);
        toast.push({
          type: "error",
          title: "Upload failed",
          message:
            err?.message ??
            "Could not upload file. Please re-upload from the document page.",
        });
      });
    // Only run once when selectedVersion first becomes available
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVersion?.id]);

  // ── Header action confirm modal ──────────────────────────────
  const [confirmAction, setConfirmAction] = useState<{
    key: string;
    label: string;
    variant: "primary" | "danger" | "outline";
    onClick: (note?: string) => Promise<void> | void;
  } | null>(null);
  const [processingKey, setProcessingKey] = useState<string | null>(null);

  const handleHeaderActionClick = (a: any) => {
    setConfirmAction(a);
  };

  const handleHeaderActionConfirm = async (note?: string) => {
    if (!confirmAction) return;
    const actionToRun = confirmAction;
    setProcessingKey(actionToRun.key);
    setConfirmAction(null);
    try {
      await actionToRun.onClick(note);
    } finally {
      setProcessingKey(null);
    }
  };
const refreshAndSelectBest = React.useCallback(
    async (opts?: { preferVersionId?: number | null }) => {
      const [docData, versions] = await Promise.all([
        getDocument(id),
        getDocumentVersions(id),
      ]);
      const sorted = [...versions].sort(
        (a, b) => Number(b.version_number) - Number(a.version_number),
      );
      setDocument(docData);
      setAllVersions(sorted);
      const preferId = opts?.preferVersionId ?? null;
      const best =
        (preferId ? sorted.find((v) => v.id === preferId) : null) ??
        sorted[0] ??
        null;
      setSelectedVersion(best);
      setSearchParams((prev) => {
        const p = new URLSearchParams(prev);
        if (best) p.set("version_id", String(best.id));
        else p.delete("version_id");
        p.delete("version");
        return p;
      });
    },
    [id, setSearchParams],
  );

  useEffect(() => {
    let alive = true;
    const load = async () => {
      setError(null);
      setLoading(true);
      try {
        const [docData, versions] = await Promise.all([
          getDocument(id),
          getDocumentVersions(id),
        ]);
        if (!alive) return;
        const sorted = [...versions].sort(
          (a, b) => Number(b.version_number) - Number(a.version_number),
        );
        setDocument(docData);
        setAllVersions(sorted);
        const best =
          (selectedVersionId
            ? sorted.find((v) => v.id === selectedVersionId)
            : null) ??
          sorted[0] ??
          null;
        setSelectedVersion(best);
        setSearchParams((prev) => {
          const p = new URLSearchParams(prev);
          if (best) p.set("version_id", String(best.id));
          else p.delete("version_id");
          p.delete("version");
          return p;
        });
      } catch (err: any) {
        if (!alive) return;
        setError(err?.message ?? "Failed to load document");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    };
    load();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    let alive = true;
    const loadVersion = async () => {
      if (!selectedVersionId) return;
      if (selectedVersion?.id === selectedVersionId) return;
      setIsLoadingSelectedVersion(true);
      setError(null);
      try {
        const { version, document: docRes } =
          await getDocumentVersion(selectedVersionId);
        if (!alive) return;
        setSelectedVersion(version);
        setDocument(docRes);
      } catch (e: any) {
        if (!alive) return;
        const status = e?.response?.status;
        if (status === 404) {
          setSearchParams((prev) => {
            const p = new URLSearchParams(prev);
            p.delete("version_id");
            p.delete("version");
            return p;
          });
        } else {
          setError(e?.message ?? "Failed to load version");
        }
      } finally {
        if (!alive) return;
        setIsLoadingSelectedVersion(false);
      }
    };
    loadVersion();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVersionId]);

  // Reset header sig when version changes so new state is always accepted
  React.useEffect(() => {
    headerSigRef.current = "";
  }, [selectedVersion?.id]);

  const rightHeader = (
    <VersionsDropdown
      allVersions={allVersions}
      selectedVersion={selectedVersion}
      isLoadingSelectedVersion={isLoadingSelectedVersion}
      onSelectVersion={(v) => {
        setSearchParams((prev) => {
          const p = new URLSearchParams(prev);
          p.set("version_id", String(v.id));
          return p;
        });
      }}
    />
  );

  // ── Loading skeleton ───────────────────────────────────────────────────────

  if (!params.id || Number.isNaN(id)) {
    return (
      <div className="flex flex-col gap-3">
        <BackButton onClick={handleBack} />
        <Alert variant="danger">Invalid document id.</Alert>
      </div>
    );
  }

  if (!loading && (error || !document)) {
    return (
      <div className="flex flex-col gap-3">
        <BackButton onClick={handleBack} />
        <Alert variant="danger">{error ?? "Document not found."}</Alert>
      </div>
    );
  }

  const current = selectedVersion ?? allVersions[0] ?? null;

  const isLatestSelected = current
    ? !allVersions.some(
        (v) => Number(v.version_number) > Number(current.version_number),
      )
    : false;

  const isOwner =
    !!myOfficeId &&
    !!document?.owner_office_id &&
    Number(myOfficeId) === Number(document.owner_office_id);

  const isRevisable =
    isLatestSelected &&
    current?.status === "Distributed" &&
    (!isAdmin || adminDebugMode) &&
    isOwner;

  return (
    <>
      <DocFrame
        title={
          <div className="min-w-0">
            <div className="flex flex-wrap items-start gap-2 min-w-0">
              {loading ? (
                <Skeleton className="h-4 w-48 mt-0.5" />
              ) : (
                <span className="min-w-0 whitespace-normal wrap-break-word leading-snug">
                  {headerState?.title ?? document?.title}
                </span>
              )}
              <div className="flex shrink-0 items-center gap-2">
                {loading ? (
                  <Skeleton className="h-5 w-7 rounded-full" />
                ) : (
                  <span className="rounded-full bg-slate-100 dark:bg-surface-400 px-2 py-0.5 text-[11px] font-medium text-slate-700 dark:text-slate-300">
                    v
                    {headerState?.versionNumber ??
                      current?.version_number ??
                      "-"}
                  </span>
                )}
                {loading ? (
                  <Skeleton className="h-5 w-20 rounded-full" />
                ) : (
                  <span className="rounded-full bg-sky-50 dark:bg-sky-950/40 px-2 py-0.5 text-[11px] font-medium text-sky-700 dark:text-sky-400">
                    {headerState?.status ?? current?.status ?? "-"}
                  </span>
                )}
              </div>
            </div>
          </div>
        }
        subtitle={
          loading ? (
            <Skeleton className="h-3 w-36 mt-0.5" />
          ) : (
            <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              {document?.code ? (
                <>
                  {document.code}
                  <button
                    type="button"
                    title="Copy document code"
                    onClick={() => {
                      navigator.clipboard.writeText(document.code!);
                      setCodeCopied(true);
                      setTimeout(() => setCodeCopied(false), 1500);
                    }}
                    className="cursor-pointer flex items-center justify-center h-4 w-4 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors normal-case"
                  >
                    {codeCopied ? (
                      <Check className="h-3 w-3 text-emerald-500" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </button>
                </>
              ) : (document as any)?.reserved_code ? (
                <>
                  {(document as any).reserved_code}
                  <span className="rounded-full bg-amber-100 dark:bg-amber-950/40 px-1.5 py-0.5 text-[9px] font-semibold text-amber-600 dark:text-amber-400 normal-case tracking-normal">
                    pending
                  </span>
                </>
              ) : (
                "CODE-NOT-AVAILABLE"
              )}
            </span>
          )
        }
        onBack={handleBack}
        onBackDisabled={isLoadingSelectedVersion}
        rightWidthClass="w-[400px]"
        rightCollapsed={rightCollapsed}
        onCollapseToggle={() => setRightCollapsed((v) => !v)}
        actions={
          <div className="flex flex-wrap gap-2">
            <RefreshButton
              onClick={async () => {
                setIsRefreshing(true);
                try {
                  await refreshAndSelectBest({ preferVersionId: selectedVersion?.id });
                } catch { /* silent */ } finally {
                  setIsRefreshing(false);
                }
              }}
              loading={isRefreshing}
              title="Refresh"
            />
            {current?.status === "Distributed" && isOwner && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isLoadingSelectedVersion}
                onClick={() => setShareOpen(true)}
              >
                Share
              </Button>
            )}
            {current?.status === "Distributed" && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isLoadingSelectedVersion}
                onClick={() => navigate(`/documents/${id}/view`)}
              >
                <Library className="h-3 w-3 mr-1" />
                View in Library
              </Button>
            )}
            {isRevisable && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={isLoadingSelectedVersion}
                onClick={() => {
                  setReviseModalOpen(true);
                }}
              >
                Revise
              </Button>
            )}
            {!headerState?.isTasksReady && current?.status !== "Distributed" ? (
              <div className="h-7 w-28 rounded-md bg-slate-200 dark:bg-surface-400 animate-pulse" />
            ) : (
              (headerState?.headerActions ?? []).map((a: any) => {
                const isThis = processingKey === a.key;
                const isBusy = !!processingKey || isLoadingSelectedVersion;
                return (
                  <Button
                    key={a.key}
                    type="button"
                    size="sm"
                    variant={a.variant === "danger" ? "danger" : "primary"}
                    disabled={isBusy || a.disabled}
                    onClick={() => handleHeaderActionClick(a)}
                  >
                    {isThis ? (
                      <span className="flex items-center gap-1.5">
                        <Loader2 className="animate-spin h-3 w-3" />
                        Processing…
                      </span>
                    ) : (
                      a.label
                    )}
                  </Button>
                );
              })
            )}
            {(headerState?.versionActions ?? []).map((a: any) => (
              <Button
                key={a.key}
                type="button"
                size="sm"
                variant={
                  a.variant === "danger"
                    ? "danger"
                    : a.variant === "outline"
                      ? "outline"
                      : "secondary"
                }
                onClick={() => a.onClick()}
                disabled={!!processingKey || isLoadingSelectedVersion}
              >
                {a.label}
              </Button>
            ))}
          </div>
        }
        rightHeader={rightHeader}
        left={
          <div className="relative">
            {pendingUploadPct !== null && (
              <div className="mb-3 w-full rounded-md border-l-4 border-sky-400 dark:border-sky-600 bg-sky-50 dark:bg-sky-950/30 px-4 py-2.5 flex items-center gap-4">
                <div className="flex items-center gap-2 shrink-0">
                  <Loader2 className="animate-spin h-3.5 w-3.5 text-sky-500" />
                  <span className="text-xs font-medium text-sky-700 dark:text-sky-400">
                    Uploading file…
                  </span>
                </div>
                <div className="flex-1 h-1.5 rounded-full bg-sky-100 dark:bg-sky-900/40 overflow-hidden">
                  <div
                    className="h-full bg-sky-500 transition-[width] duration-200"
                    style={{ width: `${Math.max(2, pendingUploadPct)}%` }}
                  />
                </div>
                <span className="shrink-0 text-xs font-semibold text-sky-600 dark:text-sky-400">
                  {pendingUploadPct}%
                </span>
              </div>
            )}

            {!loading &&
              !selectedVersion &&
              !isLoadingSelectedVersion &&
              allVersions.length === 0 && (
                <Alert variant="warning">No version available.</Alert>
              )}
            <DocumentFlow
              isPageLoading={loading}
              isExternalUploading={pendingUploadPct !== null}
              adminDebugMode={adminDebugMode}
              document={document}
              version={selectedVersion}
              allVersions={allVersions}
              selectedVersion={selectedVersion}
              isLoadingSelectedVersion={isLoadingSelectedVersion}
              onSelectVersion={(v) => {
                setSearchParams((prev) => {
                  const p = new URLSearchParams(prev);
                  p.set("version_id", String(v.id));
                  return p;
                });
                logOpenedVersion(v.id, "versions_panel");
              }}
              onHeaderStateChange={(s) => {
                const sig =
                  `${s.title}|${s.code}|${s.status}|${s.versionNumber}|${s.canAct}|${s.isTasksReady}|` +
                  `${(s.headerActions ?? []).map((a) => `${a.key}:${a.disabled ? 1 : 0}:${a.variant}`).join(",")}|` +
                  `${(s.versionActions ?? []).map((a) => `${a.key}:${a.disabled ? 1 : 0}:${a.variant}`).join(",")}`;
                if (sig === headerSigRef.current) return;
                headerSigRef.current = sig;
                setHeaderState(s);
              }}
              onAfterActionClose={async () => {
                try {
                  await refreshAndSelectBest({
                    preferVersionId: selectedVersion?.id ?? null,
                  });
                } catch (e: any) {
                  // Document was deleted (404) — navigate back
                  if (e?.response?.status === 404 || e?.status === 404) {
                    navigate(fromPath);
                  }
                }
              }}
              onChanged={async () => {
                const preferId = selectedVersion?.id ?? null;
                if (preferId) {
                  try {
                    const { version: v, document: d } =
                      await getDocumentVersion(preferId);
                    setDocument(d);
                    setSelectedVersion(v);
                    setAllVersions((prev) =>
                      prev.map((x) => (x.id === v.id ? v : x)),
                    );
                    return;
                  } catch {
                    // Fall through to full refresh
                  }
                }
                await refreshAndSelectBest({ preferVersionId: preferId });
              }}
              onRightPanelContent={setRightPanelContent}
            />
          </div>
        }
        right={rightPanelContent ?? rightPanelShell}
      />

      <ShareDocumentModal
        open={shareOpen}
        documentId={document?.id ?? null}
        onClose={() => setShareOpen(false)}
        onSaved={() => {}}
      />

      <ActionConfirmModal
        action={confirmAction}
        processingKey={processingKey}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleHeaderActionConfirm}
      />

      <RevisionModal
        open={reviseModalOpen}
        documentId={document?.id ?? 0}
        onClose={() => setReviseModalOpen(false)}
        onRevised={(revised) => {
          setAllVersions((prev) => {
            const next = [revised, ...prev.filter((v) => v.id !== revised.id)];
            next.sort(
              (a, b) => Number(b.version_number) - Number(a.version_number),
            );
            return next;
          });
          setSelectedVersion(revised);
          setSearchParams((prev) => {
            const p = new URLSearchParams(prev);
            p.set("version_id", String(revised.id));
            p.delete("version");
            return p;
          });
          setReviseModalOpen(false);
        }}
      />
    </>
  );
};

export default DocumentFlowPage;
