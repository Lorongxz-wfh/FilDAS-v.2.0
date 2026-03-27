import { useEffect, useRef, useState } from "react";
import { labelCls } from "../../utils/formStyles";

export type SelectOption = {
  value: string | number;
  label: string;
  sublabel?: string;
  disabled?: boolean;
  disabledHint?: string;
};

type Props = {
  value: string | number | null;
  onChange: (value: string | number | null) => void;
  options: SelectOption[];
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  loading?: boolean;
  clearable?: boolean;
  clearLabel?: string;
  searchable?: boolean;
  className?: string;
};

export default function SelectDropdown({
  value,
  onChange,
  options,
  placeholder = "Select…",
  label,
  disabled = false,
  loading = false,
  clearable = true,
  clearLabel = "No selection",
  searchable = false,
  className = "",
}: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value) ?? null;

  useEffect(() => {
    if (!open) {
      setSearch("");
      return;
    }
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const triggerCls = [
    "w-full flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm outline-none transition",
    "border-slate-200 dark:border-surface-400 bg-white dark:bg-surface-600",
    open
      ? "border-brand-400 dark:border-brand-300"
      : "focus:border-brand-400 dark:focus:border-brand-300",
    disabled
      ? "opacity-50 cursor-not-allowed text-slate-400 dark:text-slate-500"
      : "cursor-pointer text-slate-900 dark:text-slate-100",
  ].join(" ");

  return (
    <div ref={ref} className={`relative ${className}`}>
      {label && <label className={labelCls}>{label}</label>}

      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((v) => !v)}
        className={triggerCls}
      >
        <span className="truncate min-w-0">
          {loading
            ? "Loading…"
            : selected
              ? selected.label
              : <span className="text-slate-400 dark:text-slate-500">{placeholder}</span>}
        </span>
        <svg
          className={`shrink-0 h-4 w-4 text-slate-400 dark:text-slate-500 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && !disabled && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-slate-200 dark:border-surface-400 bg-white dark:bg-surface-500 shadow-lg overflow-hidden">
          {searchable && (
            <input
              autoFocus
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
              placeholder="Search…"
              className="w-full px-3 py-2 text-sm border-b border-slate-200 dark:border-surface-400 bg-white dark:bg-surface-500 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none"
            />
          )}
          <ul className="max-h-52 overflow-y-auto">
            {clearable && !search && (
              <li>
                <button
                  type="button"
                  onClick={() => { onChange(null); setOpen(false); }}
                  className="w-full text-left px-3 py-2 text-sm text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-surface-400 transition-colors"
                >
                  {clearLabel}
                </button>
              </li>
            )}
            {(() => {
              const filtered = searchable && search
                ? options.filter((o) =>
                    o.label.toLowerCase().includes(search.toLowerCase()) ||
                    (o.sublabel ?? "").toLowerCase().includes(search.toLowerCase())
                  )
                : options;

              if (filtered.length === 0) {
                return (
                  <li className="px-3 py-2 text-sm text-slate-400 dark:text-slate-500">
                    No results
                  </li>
                );
              }

              return filtered.map((o) => {
                const isSelected = o.value === value;
                return (
                  <li key={o.value}>
                    <button
                      type="button"
                      disabled={o.disabled && !isSelected}
                      onClick={() => {
                        if (o.disabled && !isSelected) return;
                        onChange(o.value);
                        setOpen(false);
                      }}
                      className={[
                        "w-full text-left px-3 py-2 text-sm transition-colors",
                        isSelected
                          ? "bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-400 font-medium"
                          : o.disabled
                            ? "text-slate-300 dark:text-slate-600 cursor-not-allowed"
                            : "text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-surface-400",
                      ].join(" ")}
                    >
                      <span className="truncate block leading-5">
                        {o.label}
                        {o.sublabel && (
                          <span className="ml-1.5 text-xs opacity-50">{o.sublabel}</span>
                        )}
                        {o.disabled && !isSelected && o.disabledHint && (
                          <span className="ml-1.5 text-xs text-slate-400 dark:text-slate-500">
                            {o.disabledHint}
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                );
              });
            })()}
          </ul>
        </div>
      )}
    </div>
  );
}
