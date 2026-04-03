/**
 * Shared Tailwind class strings for form elements.
 * Import these instead of redefining inline — keeps styling consistent
 * and makes global updates (e.g. focus color, border radius) a one-line change.
 */

/** Full-width text/textarea input */
export const inputCls =
  "w-full rounded-md border border-slate-200 dark:border-surface-400 bg-white dark:bg-surface-600 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-slate-400 dark:focus:border-slate-500 transition disabled:opacity-50 disabled:cursor-not-allowed";

/** Select or fixed-width date/filter input (no forced w-full — caller sets width) */
export const selectCls =
  "rounded-md border border-slate-200 dark:border-surface-400 bg-white dark:bg-surface-600 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-brand-400 dark:focus:border-brand-300 transition";

/** Compact select/input for filter panels and sidebars */
export const filterSelectCls =
  "w-full rounded-md border border-slate-200 dark:border-surface-400 bg-white dark:bg-surface-600 px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-brand-400 dark:focus:border-brand-300 transition";

/** Form field label */
export const labelCls =
  "block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5";

/** Shared tab styling for underlined header tabs */
export const tabCls = (active: boolean) =>
  [
    "flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap",
    active
      ? "border-sky-500 text-slate-900 dark:text-slate-50"
      : "border-transparent text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-300",
  ].join(" ");
