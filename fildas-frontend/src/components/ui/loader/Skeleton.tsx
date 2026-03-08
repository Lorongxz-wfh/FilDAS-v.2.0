import React from "react";

type Props = {
  className?: string;
};

const Skeleton: React.FC<Props> = ({ className = "" }) => {
  return (
    <div
      className={[
        "animate-pulse rounded-md bg-slate-200 border border-slate-300 dark:bg-surface-400 dark:border-surface-300",
        className,
      ].join(" ")}
    />
  );
};

export default Skeleton;
