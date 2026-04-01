import { CalendarDays } from "lucide-react";

interface DateRangeInputProps {
  from: string;
  to: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  className?: string;
}

const dateCls =
  "rounded-md border border-slate-200 dark:border-surface-400 bg-white dark:bg-surface-600 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 outline-none focus:border-brand-400 transition [color-scheme:light] dark:[color-scheme:dark]";

export default function DateRangeInput({
  from,
  to,
  onFromChange,
  onToChange,
  className = "",
}: DateRangeInputProps) {
  return (
    <div className={`flex flex-col sm:flex-row sm:items-center gap-2 ${className}`}>
      <div className="relative flex items-center flex-1 sm:flex-initial">
        <CalendarDays className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
        <input
          type="date"
          value={from}
          onChange={(e) => onFromChange(e.target.value)}
          className={`${dateCls} pl-8 w-full sm:w-auto`}
          placeholder="From"
        />
      </div>
      <span className="hidden sm:block text-xs text-slate-400 dark:text-slate-500 select-none">
        —
      </span>
      <div className="relative flex items-center flex-1 sm:flex-initial">
        <CalendarDays className="sm:hidden pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
        <input
          type="date"
          value={to}
          onChange={(e) => onToChange(e.target.value)}
          className={`${dateCls} sm:pl-3 pl-8 w-full sm:w-auto`}
          placeholder="To"
        />
      </div>
    </div>
  );
}
