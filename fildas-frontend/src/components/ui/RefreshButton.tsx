import { RefreshCw } from "lucide-react";
import { useToastSafe } from "./toast/ToastContext";
import Tooltip from "./Tooltip";
import { normalizeError } from "../../lib/normalizeError";

type Side = "top" | "bottom" | "left" | "right";

interface RefreshButtonProps {
  /** Sync click — no toast feedback */
  onClick?: () => void;
  /**
   * Async load function — shows success/error toast on completion.
   * Return a string to use as the toast message, or void for the default.
   * Return `false` to suppress the success toast entirely.
   */
  onRefresh?: () => Promise<string | false | void>;
  loading?: boolean;
  disabled?: boolean;
  title?: string;
  tooltipSide?: Side;
  className?: string;
}

export default function RefreshButton({
  onClick,
  onRefresh,
  loading = false,
  disabled = false,
  title = "Refresh",
  tooltipSide = "bottom",
  className = "",
}: RefreshButtonProps) {
  const toast = useToastSafe();

  const handleClick = async () => {
    if (onRefresh) {
      try {
        const result = await onRefresh();
        if (result === false) return; // caller suppressed toast
        const message = typeof result === "string" ? result : "Page refreshed.";
        toast?.push({ type: "info", message, durationMs: 2500 });
      } catch (err) {
        toast?.push({ type: "error", message: normalizeError(err) });
      }
    } else {
      onClick?.();
    }
  };

  return (
    <Tooltip text={title} side={tooltipSide}>
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || loading}
        className={`flex items-center justify-center h-8 w-8 rounded-md border border-slate-200 dark:border-surface-400 bg-white dark:bg-surface-500 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-surface-400 disabled:opacity-40 transition ${className}`}
        aria-label={title}
      >
        <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
      </button>
    </Tooltip>
  );
}
