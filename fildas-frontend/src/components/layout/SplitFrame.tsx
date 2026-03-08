import React from "react";
import PageHeading from "../ui/PageHeading";

type Props = {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  right?: React.ReactNode;
  onBack?: () => void;
  onBackDisabled?: boolean;
  rightTitle?: React.ReactNode;
  rightSubtitle?: React.ReactNode;
  rightHeader?: React.ReactNode;
  rightWidthClassName?: string;
  left: React.ReactNode;
  rightPanel: React.ReactNode;
};

export default function SplitFrame({
  title,
  subtitle,
  right,
  onBack,
  onBackDisabled,
  rightTitle = "Versions",
  rightSubtitle,
  rightHeader,
  rightWidthClassName = "w-[340px]",
  left,
  rightPanel,
}: Props) {
  return (
    <div className="min-h-0 flex flex-1 flex-col overflow-hidden">
      <div className="shrink-0 border-b border-slate-200 bg-white/80 backdrop-blur dark:border-surface-400 dark:bg-surface-600/80">
        <div className="px-6 py-4">
          <PageHeading
            title={title}
            subtitle={subtitle}
            right={right}
            onBack={onBack}
            onBackDisabled={onBackDisabled}
          />
        </div>
      </div>

      <div className="min-h-0 flex flex-1 overflow-hidden">
        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto">
          <div className="px-6 py-5">{left}</div>
        </div>

        <aside
          className={[
            rightWidthClassName,
            "shrink-0 border-l border-slate-200 bg-white",
            "dark:border-surface-400 dark:bg-surface-500",
          ].join(" ")}
        >
          <div className="flex h-full min-h-0 flex-col">
            <div className="shrink-0 border-b border-slate-200 bg-slate-50/80 px-5 py-4 dark:border-surface-400 dark:bg-surface-600/80">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    {rightTitle}
                  </div>
                  {rightSubtitle && (
                    <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                      {rightSubtitle}
                    </div>
                  )}
                </div>
                {rightHeader && <div className="shrink-0">{rightHeader}</div>}
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="p-4">{rightPanel}</div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
