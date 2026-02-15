import React from "react";
import Skeleton from "../../ui/loader/Skeleton";
import InlineSpinner from "../../ui/loader/InlineSpinner";
import UploadProgress from "../../ui/loader/UploadProgress";

type Props = {
  versionId: number;

  previewPath: string | null;
  filePath: string | null;
  originalFilename?: string | null;

  status: string;

  signedPreviewUrl: string;
  previewNonce: number;

  isUploading: boolean;
  uploadProgress: number;

  isPreviewLoading: boolean;
  setIsPreviewLoading: (v: boolean) => void;

  fileInputRef: React.Ref<HTMLInputElement>;

  onOpenPreview: () => Promise<void>;
  onClickReplace: () => void;

  onDrop: (e: React.DragEvent<HTMLDivElement>) => Promise<void> | void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragLeave: (e: React.DragEvent<HTMLDivElement>) => void;

  onFileSelect: (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => Promise<void> | void;
};

const DocumentPreviewPanel: React.FC<Props> = ({
  versionId,
  previewPath,
  filePath,
  originalFilename,
  status,
  signedPreviewUrl,
  previewNonce,
  isUploading,
  uploadProgress,
  isPreviewLoading,
  setIsPreviewLoading,
  fileInputRef,
  onOpenPreview,
  onClickReplace,
  onDrop,
  onDragOver,
  onDragLeave,
  onFileSelect,
}) => {
  const hasPreview = !!filePath && !!previewPath;

  return (
    <div className="space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500 flex items-center justify-between">
        Document preview
      </h2>

      <button
        type="button"
        disabled={!previewPath}
        onClick={() => {
          onOpenPreview().catch(() => {});
        }}
        className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors ml-2 ${
          !previewPath
            ? "bg-slate-50 text-slate-400 cursor-not-allowed"
            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
        }`}
      >
        Open preview
      </button>

      <div
        className={`relative h-[600px] w-full overflow-hidden rounded-xl border-2 transition-all ${
          filePath
            ? "border-slate-200 bg-white cursor-pointer hover:border-sky-300 hover:shadow-md"
            : "border-dashed border-slate-300 bg-slate-50 cursor-pointer hover:border-sky-400 hover:bg-sky-50"
        }`}
        onClick={() => {
          if (isUploading) return;
          if (status !== "Draft") return;
          onClickReplace();
        }}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
      >
        {filePath && previewPath && !signedPreviewUrl && (
          <div className="absolute inset-0 p-4">
            <Skeleton className="h-full w-full rounded-lg" />
          </div>
        )}

        {hasPreview ? (
          <iframe
            key={`${versionId}-${previewNonce}`}
            src={signedPreviewUrl || "about:blank"}
            title="Document preview"
            className="h-full w-full"
            onLoad={() => setIsPreviewLoading(false)}
            onError={() => setIsPreviewLoading(false)}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center p-8 text-center text-sm">
            <div className="mb-3 h-12 w-12 rounded-full bg-slate-200 flex items-center justify-center">
              <svg
                className="h-6 w-6 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <p className="mb-1 font-medium text-slate-900">
              {filePath ? "Click to replace document" : "Upload new document"}
            </p>
            <p className="text-slate-500 mb-4">
              {filePath
                ? "Drag & drop or click to replace the current file"
                : "Drag & drop PDF, Word, Excel, PowerPoint, or click to browse (max 10MB)"}
            </p>
            {!!filePath && (
              <p className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                {originalFilename ?? ""}
              </p>
            )}
          </div>
        )}

        {isUploading && (
          <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex items-center justify-center">
            <div className="w-full max-w-sm rounded-xl bg-white p-4 shadow-md">
              <p className="mb-3 text-sm font-medium text-slate-700">
                {uploadProgress >= 100 ? "Processing..." : "Uploading..."}
              </p>
              <UploadProgress value={uploadProgress} />
            </div>
          </div>
        )}

        {isPreviewLoading && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center">
            <InlineSpinner className="h-8 w-8 border-2" />
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
          className="sr-only"
          onChange={onFileSelect}
        />
      </div>
    </div>
  );
};

export default DocumentPreviewPanel;
