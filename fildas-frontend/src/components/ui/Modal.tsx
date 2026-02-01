import React, { useEffect } from "react";

type Props = {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  widthClassName?: string;
};

export default function Modal({
  open,
  title,
  children,
  onClose,
  widthClassName = "max-w-lg",
}: Props) {
  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Close modal"
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/40"
      />
      <div className="relative mx-auto mt-20 w-[92vw]">
        <div
          className={[
            "mx-auto rounded-2xl border border-slate-200 bg-white shadow-xl",
            widthClassName,
          ].join(" ")}
        >
          <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
            <div className="min-w-0">
              <h2 className="truncate text-sm font-semibold text-slate-900">
                {title}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              ✕
            </button>
          </div>
          <div className="px-5 py-4">{children}</div>
        </div>
      </div>
    </div>
  );
}
