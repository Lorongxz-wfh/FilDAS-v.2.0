import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

export type SelectOption = {
  value: string | number;
  label: string;
};

type SelectProps = {
  value: string | number;
  onChange: (value: string | number) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  label?: string;
};

export default function Select({
  value,
  onChange,
  options,
  placeholder = "Select...",
  className = "",
  label,
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((o) => o.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label className="mb-1.5 block text-xs font-semibold text-slate-500 dark:text-slate-400">
          {label}
        </label>
      )}
      
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition-all hover:border-slate-300 dark:border-surface-400 dark:bg-surface-600 dark:text-slate-200 dark:hover:border-surface-300 ${
          isOpen ? "ring-2 ring-brand-500/10 border-brand-500/50" : ""
        }`}
      >
        <span className="truncate">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-[calc(100%+4px)] z-50 max-h-60 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-xl animate-in fade-in zoom-in-95 duration-100 dark:border-surface-400 dark:bg-surface-600">
          {options.length === 0 ? (
            <div className="px-3 py-2 text-sm text-slate-400">No options</div>
          ) : (
            options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50 dark:hover:bg-surface-400/50 ${
                  option.value === value
                    ? "font-bold text-brand-600 dark:text-brand-400 bg-brand-50/50 dark:bg-brand-500/10"
                    : "text-slate-600 dark:text-slate-300"
                }`}
              >
                <span className="truncate">{option.label}</span>
                {option.value === value && <Check className="h-4 w-4" />}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
