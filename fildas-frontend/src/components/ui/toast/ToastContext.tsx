// ============================================================
// ToastContext.tsx
// ============================================================
import React from "react";

export type ToastType = "success" | "error" | "warning" | "info";

export type ToastItem = {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  durationMs?: number;
};

type ToastContextValue = {
  push: (t: Omit<ToastItem, "id">) => void;
};

const ToastContext = React.createContext<ToastContextValue | null>(null);

function uid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);

  const remove = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = React.useCallback(
    (t: Omit<ToastItem, "id">) => {
      const id = uid();
      const durationMs = t.durationMs ?? 3500;
      setToasts((prev) => [{ ...t, id, durationMs }, ...prev].slice(0, 3));
      window.setTimeout(() => remove(id), durationMs);
    },
    [remove],
  );

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <ToastHost toasts={toasts} onDismiss={remove} />
    </ToastContext.Provider>
  );
};

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

const borderByType: Record<ToastType, string> = {
  success: "border-emerald-200 dark:border-emerald-800",
  error: "border-rose-200 dark:border-rose-800",
  warning: "border-amber-200 dark:border-amber-800",
  info: "border-sky-200 dark:border-sky-800",
};

const ToastHost: React.FC<{
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}> = ({ toasts, onDismiss }) => {
  return (
    <div className="fixed right-4 top-4 z-9999 flex w-90 max-w-[calc(100vw-2rem)] flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={[
            "rounded-xl border px-4 py-3 shadow-lg backdrop-blur",
            "bg-white/95 dark:bg-surface-500/95",
            borderByType[t.type],
          ].join(" ")}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              {t.title ? (
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                  {t.title}
                </p>
              ) : null}
              <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                {t.message}
              </p>
            </div>

            <button
              type="button"
              onClick={() => onDismiss(t.id)}
              className="shrink-0 rounded-md px-2 py-1 text-sm text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-surface-400"
              aria-label="Dismiss"
              title="Dismiss"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
