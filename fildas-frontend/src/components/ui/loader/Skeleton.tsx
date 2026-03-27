import React from "react";

type Props = {
  className?: string;
  style?: React.CSSProperties;
};

const Skeleton: React.FC<Props> = ({ className = "", style }) => {
  return (
    <div
      style={style}
      className={[
        "animate-pulse rounded-md bg-slate-200 border border-slate-300 dark:bg-surface-400 dark:border-surface-300",
        className,
      ].join(" ")}
    />
  );
};

export default Skeleton;
