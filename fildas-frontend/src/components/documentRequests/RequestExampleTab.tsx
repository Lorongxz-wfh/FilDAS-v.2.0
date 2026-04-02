import { FileText } from "lucide-react";
import RequestPreviewBox from "./RequestPreviewBox";

type Props = {
  req: any;
  examplePreviewUrl: string;
  examplePreviewLoading: boolean;
  examplePreviewError: string | null;
  onRefresh: () => void;
  onViewModal: () => void;
};

export default function RequestExampleTab({
  req,
  examplePreviewUrl,
  examplePreviewLoading,
  examplePreviewError,
  onRefresh,
  onViewModal,
}: Props) {
  return (
    <div className="flex flex-col flex-1 min-h-0 gap-3">
      <div className="shrink-0 flex items-center gap-3 rounded-lg border border-slate-200 dark:border-surface-400 bg-white dark:bg-surface-500 px-5 py-4">
        <FileText size={14} className="text-slate-400 dark:text-slate-500 shrink-0" />
        <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate flex-1">
          {req.example_original_filename ??
            (req.example_file_path ? "Attached" : "No example file")}
        </span>
        <span className="text-xs text-slate-400 dark:text-slate-500 shrink-0">
          Reference
        </span>
      </div>
      <RequestPreviewBox
        url={examplePreviewUrl}
        loading={examplePreviewLoading}
        error={examplePreviewError}
        filename={req.example_original_filename}
        emptyLabel={
          req.example_file_path
            ? "Preview not available for this file type."
            : "No example file attached."
        }
        onRefresh={req.example_preview_path ? onRefresh : undefined}
        onViewModal={examplePreviewUrl ? onViewModal : undefined}
      />
    </div>
  );
}
