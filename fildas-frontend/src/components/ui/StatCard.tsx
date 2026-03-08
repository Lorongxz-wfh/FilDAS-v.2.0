import React from "react";
import InlineSpinner from "./loader/InlineSpinner";

type Props = {
  label: string;
  value: number;
  loading?: boolean;
  valueClassName?: string;
};

export default function StatCard({
  label,
  value,
  loading,
  valueClassName = "",
}: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-5 px-4">
      <div
        className={["text-3xl font-semibold tabular-nums", valueClassName].join(
          " ",
        )}
      >
        {loading ? <InlineSpinner className="h-5 w-5 border-2" /> : value}
      </div>
      <div className="mt-1 text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {label}
      </div>
    </div>
  );
}
