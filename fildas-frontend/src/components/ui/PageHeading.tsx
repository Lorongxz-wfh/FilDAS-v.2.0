import React from "react";

import BackButton from "./buttons/BackButton";

type Props = {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  right?: React.ReactNode;
  onBack?: () => void;
  onBackDisabled?: boolean;
  className?: string;
};

export default function PageHeading({
  title,
  subtitle,
  right,
  onBack,
  onBackDisabled,
  className = "",
}: Props) {
  return (
    <div
      className={[
        "flex items-start justify-between gap-4 min-w-0",
        className,
      ].join(" ")}
    >
      <div className="flex items-center gap-2 min-w-0">
        {onBack && <BackButton onClick={onBack} disabled={onBackDisabled} />}
        <div className="min-w-0">
          <h1 className="text-xl font-semibold leading-tight tracking-tight text-slate-900 dark:text-slate-100">
            {title}
          </h1>
          {subtitle && (
            <div className="mt-1 text-sm leading-snug text-slate-500 dark:text-slate-400">
              {subtitle}
            </div>
          )}
        </div>
      </div>
      {right && <div className="shrink-0 flex items-center gap-2">{right}</div>}
    </div>
  );
}
