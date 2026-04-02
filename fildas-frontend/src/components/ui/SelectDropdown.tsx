import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { labelCls } from "../../utils/formStyles";

export type SelectOption = {
  value: string | number;
  label: string;
  sublabel?: string;
  dot?: string; // tailwind bg-* class for a status dot
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
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});

  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const selected = options.find((o) => o.value === value) ?? null;

  // Position the portal menu under the trigger button
  const updateMenuPosition = () => {
    if (!triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    setMenuStyle({
      position: "fixed",
      top: r.bottom + 4,
      left: r.left,
      width: r.width,
      zIndex: 9999,
    });
  };

  useLayoutEffect(() => {
    if (open) updateMenuPosition();
  }, [open]);

  useEffect(() => {
    if (!open) {
      setSearch("");
      return;
    }

    const handleScroll = () => updateMenuPosition();
    const handleResize = () => updateMenuPosition();
    const handleMousedown = (e: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        // Check if click is inside the portal menu
        const menu = document.getElementById("select-dropdown-portal-menu");
        if (menu && menu.contains(e.target as Node)) return;
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleMousedown);
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleResize);
    return () => {
      document.removeEventListener("mousedown", handleMousedown);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleResize);
    };
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

  const menu = open && !disabled && (
    <div
      id="select-dropdown-portal-menu"
      style={menuStyle}
      className="rounded-md border border-slate-200 dark:border-surface-400 bg-white dark:bg-surface-500 shadow-lg overflow-hidden"
    >
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
          const filtered =
            searchable && search
              ? options.filter(
                  (o) =>
                    o.label.toLowerCase().includes(search.toLowerCase()) ||
                    (o.sublabel ?? "").toLowerCase().includes(search.toLowerCase()),
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
                  <span className="flex items-center gap-2 leading-5">
                    {o.dot && (
                      <span className={`shrink-0 h-1.5 w-1.5 rounded-full ${o.dot}`} />
                    )}
                    <span className="truncate">{o.label}</span>
                    {o.sublabel && !o.dot && (
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
  );

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      {label && <label className={labelCls}>{label}</label>}

      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((v) => !v)}
        className={triggerCls}
      >
        <span className="truncate min-w-0">
          {loading ? (
            "Loading…"
          ) : selected ? (
            <span className="flex items-center gap-2">
              {selected.dot && (
                <span className={`shrink-0 h-1.5 w-1.5 rounded-full ${selected.dot}`} />
              )}
              {selected.label}
            </span>
          ) : (
            <span className="text-slate-400 dark:text-slate-500">{placeholder}</span>
          )}
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

      {menu && createPortal(menu, document.body)}
    </div>
  );
}
