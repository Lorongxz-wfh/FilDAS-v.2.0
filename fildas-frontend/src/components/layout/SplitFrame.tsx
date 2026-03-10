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
  onRightTitleClick?: () => void;
  rightCollapsed?: boolean;
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
  onRightTitleClick,
  rightCollapsed = false,
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
            rightCollapsed ? "w-10" : rightWidthClassName,
            "shrink-0 border-l border-slate-200 bg-white transition-all duration-200",
            "dark:border-surface-400 dark:bg-surface-500",
          ].join(" ")}
        >
          <div className="flex h-full min-h-0 flex-col">
            <div className="shrink-0 border-b border-slate-200 bg-slate-50/80 dark:border-surface-400 dark:bg-surface-600/80">
              <button
                type="button"
                onClick={onRightTitleClick}
                className={[
                  "flex w-full items-center gap-2 px-4 py-3 transition",
                  onRightTitleClick
                    ? "hover:bg-slate-100 dark:hover:bg-surface-500 cursor-pointer"
                    : "cursor-default",
                  rightCollapsed ? "justify-center" : "justify-between",
                ].join(" ")}
              >
                {rightCollapsed ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 text-slate-400 dark:text-slate-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                ) : (
                  <>
                    <div className="flex items-center gap-2 min-w-0">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                      <div className="min-w-0 text-left">
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          {rightTitle}
                        </div>
                        {rightSubtitle && (
                          <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                            {rightSubtitle}
                          </div>
                        )}
                      </div>
                    </div>
                    {rightHeader && (
                      <div className="shrink-0">{rightHeader}</div>
                    )}
                  </>
                )}
              </button>
            </div>
            {!rightCollapsed && (
              <div className="min-h-0 flex-1 overflow-y-auto">
                <div className="p-4">{rightPanel}</div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
